# `lawn.rndpig.com` — Implementation Plan

**Status:** Planning. No code yet.
**Last updated:** 2026-05-31
**Owner:** rndpig
**Repository:** `lawn-control` (local), https://github.com/rndpig/lawn-control.git (planned)
**Public URLs (planned):** `https://lawn.rndpig.com`, `https://lawn-api.rndpig.com`
**Server:** dilger (192.168.7.215), backend port **8004** (next free)
**Status:** Initial scaffold landed (FastAPI `/health` + React/Vite shell + Firebase auth wiring). Subdomain provisioning, Firebase project creation, and phase 1 of the migration are still TODO.
**Companion doc:** [SUBDOMAIN_SETUP.md](./SUBDOMAIN_SETUP.md) — generic subdomain provisioning playbook

---

## 1. Vision

`lawn.rndpig.com` is the **central intelligence layer for the property**. It is the canonical home for:

1. **The property model** — base map image, irrigation zones, deer travel corridors, sensor placements, ignore zones, camera FOVs, ultrasonic emitter cones — all in a single edited-once / read-everywhere overlay document.
2. **Sensor + actuator state** — current and historical readings from every device on the property: Ambient Weather, SunPower PVS, ESPHome lux sensors, soil-moisture probes, Ring cameras, Rainbird controller, deer-detector pose direction.
3. **Irrigation intelligence** — the *only* component allowed to drive the Rainbird controller. Decides what to water, when, and for how long, based on weather, soil moisture, solar, and detection events.
4. **A stable public API** that other apps (`deer.rndpig.com`, `weather.rndpig.com`, future ones) call instead of duplicating logic.

In other words: the existing apps stay focused on *what they're good at* (deer detection, weather display) and **delegate property-state and irrigation decisions to lawn**.

---

## 2. Why now

Several signals say the architecture is ready:

- **Property map modal is duplicated** in deer-deterrent and weather-monitor. Weather's edit UX is good; deer's isn't. Continuing to fork it is wasteful.
- **Two services already touch Rainbird** (deer coordinator + ad-hoc scripts). Centralizing avoids race conditions and missing cooldowns.
- **Deer pose v1.0 is wired in** but produces zone routing decisions that should depend on more than "which camera saw it" — soil moisture, last-watered time, weather forecast, deer travel direction. That's lawn's job.
- **Multiple sensor backends already store data** in three places (deer SQLite, weather SQLite, network-monitor). A unified read API is overdue.

---

## 3. Boundaries — what lawn IS and IS NOT

**Lawn IS:**
- The single source of truth for the property overlay (geometry).
- The single Rainbird controller — *no other process should issue zone activations.*
- A read-through aggregator over deer/weather/sensor APIs.
- A scheduling brain (cron-like + reactive policies).
- An authenticated public API.

**Lawn IS NOT:**
- A re-implementation of deer detection. The deer app keeps doing ML and posting events; lawn subscribes.
- A re-implementation of weather collection. The weather app keeps polling Ambient/PVS; lawn pulls aggregates.
- A long-term-storage replacement. Each app keeps owning its own SQLite. Lawn stores its own decisions, policies, and overlay.

---

## 4. Architecture

```
                        ┌────────────────────────────────────┐
                        │   lawn.rndpig.com (Firebase SPA)    │
                        └───────────────┬─────────────────────┘
                                        │ Firebase ID token
                                        ▼
                        ┌────────────────────────────────────┐
                        │ lawn-api.rndpig.com  (FastAPI :8004)│
                        │ ──────────────────────────────────  │
                        │ - Property overlay store (SQLite)   │
                        │ - Irrigation policy engine          │
                        │ - Rainbird controller (sole owner)  │
                        │ - Aggregation layer (read-through)  │
                        │ - Decision log + audit trail        │
                        └─┬──────────────┬──────────────┬─────┘
                          │              │              │
            INTERNAL_API_KEY              │              │
                          ▼              ▼              ▼
                    deer-api      weather-api    network-api
                    (events,      (current,      (status,
                     pose)         soil, lux)    devices)

                                                           ▲
                                                           │
                                          deer + weather + future apps
                                          read overlay & call lawn API
                                          for property state
```

### Data ownership

| Data | Owner | Lawn role |
|---|---|---|
| Property overlay (image, zones, ignore zones, sensor pins) | **lawn** | Source of truth. Other apps read via `/api/v1/property/overlay`. |
| Camera-to-zone mapping | **lawn** | Replaces `camera_zones` in deer settings. Deer reads from lawn. |
| Ring events / deer detections | deer-deterrent | Lawn pulls aggregates and pose history. |
| Weather readings | weather-monitor | Lawn pulls current + last-N-hours. |
| Solar + lux | weather-monitor | Lawn pulls. |
| Soil moisture (8 channels) | weather-monitor (today) | May migrate to lawn if it becomes irrigation-critical. |
| Rainbird zone state, history, cooldowns, policies | **lawn** | Sole writer. |

---

## 5. Data model (SQLite — `data/lawn.db`)

### Tables (proposed)

| Table | Purpose |
|---|---|
| `property_overlay` | Single-row JSON document store, identical schema to today's deer/weather overlay. Migrated from deer's `property_overlay` table. |
| `property_image` | Single-row blob: PNG bytes + ETag + uploaded_by + uploaded_at. |
| `zones` | One row per Rainbird zone. id, name, description, default_duration_s, min_interval_s, soil_sensor_id, last_watered_at, last_decision_id. |
| `irrigation_events` | Append-only log of every Rainbird activation. zone_id, started_at, duration_requested_s, duration_actual_s, trigger ('schedule' / 'deer' / 'manual' / 'soil_dry' / 'api'), trigger_metadata_json, succeeded, error. |
| `irrigation_policies` | Per-zone or global policy. type ('schedule' / 'soil_threshold' / 'deer_response' / 'rain_skip'), config_json, enabled. |
| `decisions` | Audit log: every policy evaluation that ran, what it decided, why. Includes "did nothing" decisions for traceability. |
| `external_app_keys` | Map app name (`deer`, `weather`) → scoped API key + allowed paths, similar to today's `MAP_SHARE_KEY`. |

Migration: copy deer's `property_overlay` row into lawn at first boot, then deer's overlay endpoints become read-through clients of lawn (with a feature flag for rollback).

---

## 6. Irrigation intelligence — phased rollout

### Phase 0 (already exists, in deer)
- Coordinator triggers Rainbird zones from `camera_zones` mapping when a deer is detected. Cooldown enforced. Pose direction logged but ignored.

### Phase 1 — Lawn becomes the controller
- Move Rainbird client code from deer coordinator to lawn.
- Deer coordinator instead **POSTs** detection events to `lawn-api.rndpig.com/api/v1/triggers/deer` with `{camera_id, confidence, bbox, pose_direction_deg, timestamp}`.
- Lawn's deer-response policy looks up `camera_id → zone[s]`, applies cooldown, calls Rainbird.
- Outcome: identical behavior, but Rainbird has a single owner. Verify by replaying recent deer events.

### Phase 2 — Pose-aware zone routing
- Deer-response policy uses `pose_direction_deg` to pick the **next** zone in the deer's travel path, not just the camera's zone.
- Requires the property overlay to encode each zone's polygon centroid (already supported in the overlay schema).
- Compute angle from camera position to each candidate zone; pick the zone closest to the deer's heading vector. Fall back to camera-mapped zone if pose is missing.

### Phase 3 — Sensor-aware policies
- Soil-moisture-driven scheduling: zone X waters only if `soil_sensor_X.moisture < threshold` and `forecast_rain_24h < 0.1in`.
- Light-aware scheduling: skip irrigation during direct sun if lux > N (evaporation loss).
- Solar-aware scheduling: prefer running during PVS surplus production.

### Phase 4 — Property-aware deterrence
- Combine deer + ultrasonic (future) emitters in a coordinated response, so the same overlay drives both.

Each phase is independently shippable. Phase 1 is the architectural bet; phases 2-4 are policy improvements on top.

---

## 7. Public API surface (v1)

All routes under `https://lawn-api.rndpig.com/api/v1/`. Auth: Firebase ID token (frontend) **or** scoped API key (other apps) via `X-API-Key`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/property/overlay` | Full overlay JSON document. Cacheable with ETag. |
| `PUT` | `/property/overlay` | Replace overlay (admin only). |
| `GET` | `/property/image` | PNG of base map. ETag. |
| `POST` | `/property/image` | Upload new base map (admin only). |
| `GET` | `/zones` | List zones with current state, last-watered, soil reading. |
| `GET` | `/zones/{id}` | Single zone detail + recent history. |
| `POST` | `/zones/{id}/activate` | Manual activation. Body: `{duration_s, reason}`. |
| `GET` | `/irrigation/events` | Activation history. Filters: from, to, zone_id, trigger. |
| `GET` | `/irrigation/policies` | List policies. |
| `PUT` | `/irrigation/policies/{id}` | Edit policy. |
| `GET` | `/sensors/current` | Read-through aggregation: weather + soil + lux + solar. |
| `GET` | `/decisions` | Decision log. Useful for "why did/didn't it water?". |
| `POST` | `/triggers/deer` | Inbound from deer coordinator. Authenticated by `X-API-Key`. |
| `POST` | `/triggers/weather` | Inbound from weather (e.g., heavy-rain skip signal). |
| `GET` | `/health` | Standard health probe (open). |

Versioning: prefix `/api/v1/`. When breaking changes are needed, ship `/api/v2/` and keep v1 alive for at least one app cycle.

---

## 8. Frontend (Firebase + React + Vite)

Mirror the weather-monitor stack (it's the cleaner of the two existing frontends):

- React 19, TypeScript, Vite, Recharts, lucide-react, date-fns
- Dark theme (CSS custom properties), no global state lib
- Firebase Auth via `useAuth()` hook (copied from deer)
- API client in `services/api.ts` attaches `Bearer` token on every call

### Pages / tabs

1. **Map editor** — re-implement weather's overlay editor as the canonical version. This is the experience that everything else imports.
2. **Zones** — grid of zone cards: name, last-watered, current soil moisture, "Run now" button, link to recent activations.
3. **Schedule** — visualize and edit irrigation policies.
4. **History** — chronological irrigation events + decision log.
5. **Live** — current sensor read-through, recent deer detections (read from deer-api), weather card.
6. **Settings** — Firebase admin emails, Rainbird IP, default cooldowns, API keys for sister apps.

### Reusable map component

Once the editor is solid in lawn, deer and weather **delete their local copies** and load `lawn.rndpig.com/api/v1/property/overlay` for read-only display. The shared component itself can either:

- Live in lawn's repo and be fetched via `<iframe>` (simplest, no shared package),
- Or be published as a small npm package (e.g. `@rndpig/property-map`) and imported by all three apps. Decide during phase 1.

---

## 9. Backend (FastAPI on dilger)

- Python 3.12, FastAPI, SQLAlchemy async with `aiosqlite`, Pydantic Settings — same as weather.
- `pyrainbird==6.1.2` (matches deer coordinator) for Rainbird control.
- `aiohttp` for outbound calls to deer-api / weather-api / network-api.
- Background tasks for: scheduled irrigation, sensor polling cache refresh, decision-engine tick.
- SQLite at `data/lawn.db` (WAL mode).
- Bind to `127.0.0.1:8004`.

### Deployment shape

Pick **systemd** (matches weather) for simpler iteration:

- Service unit at `/etc/systemd/system/lawn-backend.service`
- Working dir `/home/rndpig/lawn-monitor`
- `python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8004`
- Restart on failure

Containerizing later is easy if needed.

### Auth

Copy `deer-deterrent/backend/auth.py`, change `FIREBASE_PROJECT_ID = "lawn-rnp"`, restrict by allowed email list, keep `INTERNAL_API_KEY` for service-to-service. Add `EXTERNAL_APP_KEYS` env var (JSON dict `{ "deer": "...", "weather": "..." }`) so cross-app calls can be scoped per app and rotated independently.

---

## 10. Migration plan for existing apps

### deer-deterrent
1. **Phase 1 prep:** add a feature flag `LAWN_API_URL`. When set, coordinator POSTs deer events to `lawn-api/api/v1/triggers/deer` and **does not** call Rainbird itself.
2. Property overlay endpoints in deer's backend become thin proxies to lawn (read-through with a short cache). Eventually deleted.
3. `camera_zones` setting moves out of `/api/settings` and into lawn.
4. Dashboard map modal stops being editable — directs the user to `lawn.rndpig.com` for edits, displays read-only there.

### weather-monitor
1. Map modal becomes read-only and consumes lawn's overlay API.
2. Eventually delete weather's local overlay store.
3. Optionally expose a `/triggers/weather` POST so weather can tell lawn "heavy rain forecast — skip next hour".

### rndpig.com landing
- Add a `Lawn` card linking to https://lawn.rndpig.com. See [SUBDOMAIN_SETUP.md §6](./SUBDOMAIN_SETUP.md#6-update-rndpigcom-landing-page).

---

## 11. Implementation roadmap (rough order)

1. **Stand up the subdomain** end-to-end with a "hello world" backend and a single page that reads `/health`. Follow [SUBDOMAIN_SETUP.md](./SUBDOMAIN_SETUP.md). Acceptance: `curl https://lawn-api.rndpig.com/health` works, frontend loads behind Google sign-in.
2. **Move overlay storage.** Build `/api/v1/property/overlay` and `/api/v1/property/image`. Migrate deer's overlay row in. Build the map editor. Acceptance: weather's modal can be pointed at lawn and renders identically.
3. **Add zone model + Rainbird client.** Implement `/api/v1/zones` and `POST /api/v1/zones/{id}/activate`. Acceptance: manual zone activation from lawn UI works.
4. **Phase 1 deer migration.** Implement `/api/v1/triggers/deer`. Add `LAWN_API_URL` flag in deer coordinator. Acceptance: a deer detection on dilger fires irrigation via lawn, with a row appearing in `irrigation_events` and `decisions`.
5. **Aggregation layer.** `/api/v1/sensors/current` reads from deer-api and weather-api. Cache for 30s. Acceptance: weather + lux + soil + last-deer-time visible on lawn dashboard without re-querying upstream apps.
6. **Pose-aware routing (phase 2).** Acceptance: replay recent deer events and confirm zone selection differs when pose direction is present.
7. **Soil-aware policies (phase 3).** Acceptance: low-moisture zones water on schedule; recently-watered or wet zones skip.
8. **Cleanup.** Delete deer's overlay editor, deer's Rainbird code, and the legacy zone settings.

---

## 12. Open questions to resolve before coding

- **Map editor reuse:** iframe vs shared npm package vs duplicate component? (See §8.)
- **Soil moisture ownership:** stays in weather-monitor or migrates to lawn? Affects the sensor model.
- **History retention:** how many years of `irrigation_events` and `decisions` before pruning?
- **Rollback of phase 1:** should there be a "manual override" toggle in lawn that re-enables deer's local Rainbird call in case lawn is down? Or do we accept that lawn-down means no deer-triggered watering until lawn is back? (Recommendation: latter — lawn-down is a maintenance window, not a runtime failure.)

These can be answered iteratively; flagging now so the next agent picks them up.

---

## 13. References

- [SUBDOMAIN_SETUP.md](./SUBDOMAIN_SETUP.md) — provisioning playbook.
- [`deer-deterrent/.github/copilot-instructions.md`](../../deer-deterrent/.github/copilot-instructions.md)
- [`weather-monitor/.github/copilot-instructions.md`](../../weather-monitor/.github/copilot-instructions.md)
- Existing tunnel config: `weather-monitor/cloudflared-config.yml`
- Existing auth pattern: `deer-deterrent/backend/auth.py`, `deer-deterrent/frontend/src/firebase.js`
