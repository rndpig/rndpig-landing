# Subdomain Setup Playbook — `*.rndpig.com`

**Last updated:** 2026-05-31
**Audience:** AI agents and the owner provisioning a brand-new subdomain end-to-end.
**Scope:** All `*.rndpig.com` subdomains. Covers DNS, Cloudflare Tunnel, Firebase Hosting, Firebase Auth, backend wiring, and the rndpig.com landing-page card.

> **Key insight:** Even though `rndpig.com` is registered at GoDaddy, **all DNS for `rndpig.com` is delegated to Cloudflare**. You should **never need to touch GoDaddy** when adding a new subdomain. The GoDaddy nameservers point at Cloudflare; from there, every subdomain is managed in the Cloudflare dashboard. The legacy `DEPLOYMENT.md` in this repo references GoDaddy DNS — that document predates the Cloudflare migration and is no longer accurate for new subdomains.

---

## 0. Decide the subdomain shape

Before touching anything, decide:

| Question | Common answer for this stack |
|---|---|
| What is the public hostname? | `<name>.rndpig.com` (frontend) |
| Is there a backend API? | Usually yes → `<name>-api.rndpig.com` |
| Where does the frontend run? | Firebase Hosting (project `<name>-rnp`) or GitHub Pages |
| Where does the backend run? | The Dell server `dilger` (192.168.7.215) on a chosen localhost port |
| Cloudflare Tunnel routing? | Reuse existing tunnel `48dab637-7544-4bb0-a38a-58e058145490` |
| Auth model? | Firebase Auth (Google sign-in) — same pattern as deer-deterrent / weather-monitor |
| Allowed Google account(s)? | Owner's account; restrict by `email` claim in backend |

**Pick a free port on dilger** for the new backend. Currently used:

| Port | Service |
|---|---|
| 8000 | deer-deterrent backend |
| 8001 | deer-deterrent ml-detector |
| 8002 | network-monitor backend |
| 8003 | weather-monitor backend |
| 8004 | lawn-control backend |
| 5000 | deer-deterrent coordinator |
| 1883/9001 | mosquitto |
| 5432 | postgres (legacy) |
| 8554/55123 | ring-mqtt |
| 9080 | network-monitor frontend (containerized) |
| 8080 | weather-monitor frontend (nginx) |

Pick the next free port (e.g. **8004** for the next backend).

---

## 1. Cloudflare DNS — add the public hostnames

The owner manages DNS at https://dash.cloudflare.com → zone `rndpig.com`.

For a typical app you add **two** CNAME records, both **proxied (orange cloud)**:

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `<name>` | `<tunnel-id>.cfargotunnel.com` | Proxied |
| CNAME | `<name>-api` | `<tunnel-id>.cfargotunnel.com` | Proxied |

Use the existing tunnel ID: `48dab637-7544-4bb0-a38a-58e058145490`
→ target: `48dab637-7544-4bb0-a38a-58e058145490.cfargotunnel.com`

**Notes:**
- For Firebase-hosted frontends you can alternatively point the frontend CNAME to the Firebase target (`<project>.web.app`) — but routing through Cloudflare Tunnel + a small reverse proxy on dilger is the established pattern (matches weather, network).
- TTL: leave on Auto.
- No GoDaddy changes are required.

> If you ever need to verify nameserver delegation: in PowerShell, `Resolve-DnsName -Type NS rndpig.com`. Should return the two assigned `*.ns.cloudflare.com` servers.

---

## 2. Cloudflare Tunnel — add ingress rules

The tunnel runs as `cloudflared.service` (systemd) on dilger. Its config lives at `/etc/cloudflared/config.yml` (root-owned). The repo copy is at `weather-monitor/cloudflared-config.yml`.

### 2a. Edit the tunnel config on dilger

Add two new ingress entries **above** the catch-all `http_status:404`:

```yaml
ingress:
  # ... existing entries ...
  - hostname: <name>.rndpig.com
    service: http://localhost:<frontend-port>     # often 8080-style nginx proxy or Firebase pass-through
  - hostname: <name>-api.rndpig.com
    service: http://localhost:<backend-port>
  - service: http_status:404
```

Apply it:

```powershell
# from local repo, edit weather-monitor/cloudflared-config.yml first, then:
scp weather-monitor/cloudflared-config.yml dilger:/tmp/cloudflared-config.yml
ssh -n -T dilger "sudo cp /tmp/cloudflared-config.yml /etc/cloudflared/config.yml && sudo systemctl restart cloudflared && sudo systemctl status cloudflared --no-pager | head -15"
```

### 2b. Authorize the tunnel for the new hostnames

If the hostnames don't already resolve (check `Resolve-DnsName <name>.rndpig.com`), tell Cloudflare which tunnel owns them:

```bash
ssh -n -T dilger "cloudflared tunnel route dns 48dab637-7544-4bb0-a38a-58e058145490 <name>.rndpig.com"
ssh -n -T dilger "cloudflared tunnel route dns 48dab637-7544-4bb0-a38a-58e058145490 <name>-api.rndpig.com"
```

These commands create the CNAME for you if step 1 was skipped, but doing it explicitly in the dashboard is preferred for visibility.

> **Always commit `cloudflared-config.yml` back to the repo** so the next agent has an accurate snapshot of tunnel routing.

---

## 3. Firebase Hosting — create the project (skip if using GitHub Pages)

This is the established pattern for app frontends (`deer-deterrent-rnp`, `weather-monitor-rnp`).

### 3a. Create the Firebase project

In a browser → https://console.firebase.google.com → "Add project":

- **Project name:** `<name>-rnp` (e.g. `lawn-rnp`)
- **Project ID:** auto-suggested; keep it as `<name>-rnp`
- Disable Google Analytics (not used in this stack).

### 3b. Add a Web app

In the new project → ⚙️ → Project settings → "Your apps" → Web (`</>` icon):

- **App nickname:** `<name>-web`
- Skip Firebase Hosting offer in this wizard — we set it up via CLI below.
- Copy the `firebaseConfig` object that appears. You'll paste it into `frontend/src/firebase.js`.

### 3c. Enable Authentication

In the new project → Authentication → Get started → Sign-in method:
- Enable **Google** provider
- Set **Project support email** to the owner's email
- Save

### 3d. Authorize the custom domain

Authentication → Settings → **Authorized domains** → Add domain → `<name>.rndpig.com`
(The default `*.firebaseapp.com` and `*.web.app` are pre-approved.)

### 3e. CLI init in the repo

```powershell
# Once per machine if not already authed:
firebase login

# In the new project repo:
cd <project>/frontend
firebase use --add        # pick <name>-rnp, alias "default"
firebase init hosting
# Answers:
#   Public directory:        dist
#   Single-page app:         Yes
#   Set up auto-builds:      No
#   Overwrite index.html:    No
```

The resulting `firebase.json` should mirror `deer-deterrent/frontend/firebase.json` (SPA rewrites + 1-year cache headers on static assets).

### 3f. Custom domain on Firebase Hosting

Firebase Console → Hosting → Add custom domain → `<name>.rndpig.com`.

Firebase will ask for an **A record verification** (a `TXT` record). Add the TXT record in Cloudflare (DNS Only / grey cloud). Once verified, **delete the TXT** and let the existing Cloudflare-proxied CNAME from step 1 do the routing.

> If you ever see `Site Not Found` from Firebase via the custom domain, it's almost always because the proxied CNAME is missing or the Firebase domain wasn't authorized — re-check steps 1 and 3d.

### 3g. Deploy

```powershell
cd <project>/frontend
npm install
npm run build
firebase deploy --only hosting
```

Verify both URLs work:
- `https://<name>-rnp.web.app` (default Firebase URL)
- `https://<name>.rndpig.com` (custom domain via Cloudflare)

---

## 4. Frontend Firebase + Auth wiring

Mirror the deer-deterrent / weather-monitor pattern exactly.

### 4a. `frontend/src/firebase.js`

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "...",                                  // from step 3b
  authDomain: "<name>-rnp.firebaseapp.com",
  projectId: "<name>-rnp",
  storageBucket: "<name>-rnp.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

> The `apiKey` is **not a secret** — it's a public client identifier scoped to authorized domains.

### 4b. `frontend/src/hooks/useAuth.js`

Copy verbatim from `deer-deterrent/frontend/src/hooks/useAuth.js`. Provides:
- `useAuth()` returning `{ user, loading, signIn, signOut }`
- Google `signInWithPopup` flow
- `VITE_DISABLE_AUTH=true` mock-user escape hatch for local development

### 4c. API client — attach Firebase ID token

Mirror `deer-deterrent/frontend/src/api.js`. Every authenticated REST call sends:

```javascript
const token = await auth.currentUser?.getIdToken();
headers['Authorization'] = `Bearer ${token}`;
```

### 4d. Vite env vars

Use `import.meta.env.VITE_API_URL || 'https://<name>-api.rndpig.com'` in the API client. Set `VITE_DISABLE_AUTH=true` in `.env.local` only if you ever want to bypass auth locally (the owner does not test locally — but the flag exists in the pattern).

---

## 5. Backend Firebase auth wiring

Copy `deer-deterrent/backend/auth.py` verbatim, then:

1. Change `FIREBASE_PROJECT_ID = "<name>-rnp"` (this is the Firebase project ID, **not** a secret).
2. Keep the `INTERNAL_API_KEY` env-var pattern for service-to-service calls (cron jobs, other apps calling this app's API).
3. If you want to embed an API client in *another* `*.rndpig.com` app's frontend, use the `MAP_SHARE_KEY` pattern (scoped key, restricted to specific paths in middleware). Never put `INTERNAL_API_KEY` in client bundles.
4. Restrict access by email in the auth middleware:
   ```python
   ALLOWED_EMAILS = {"rndpig@gmail.com"}  # or pull from env
   if decoded.get("email") not in ALLOWED_EMAILS:
       return JSONResponse(status_code=403, content={"detail": "Not authorized"})
   ```

### CORS

In `main.py`, add the new app's origins to the CORS allowlist **and** add cross-app origins if this backend will be consumed by other rndpig apps:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://<name>-rnp.web.app",
        "https://<name>.rndpig.com",
        # cross-app consumers (if applicable):
        "https://deer.rndpig.com",
        "https://weather.rndpig.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Backend deployment on dilger

Two patterns are in use; pick one:

- **Docker Compose** (deer-deterrent): add a service to `docker-compose.yml`, `docker compose build && up -d`.
- **systemd** (weather-monitor, network-monitor): place a `<name>-backend.service` unit in `/etc/systemd/system/`, `sudo systemctl daemon-reload && sudo systemctl enable --now <name>-backend`.

Bind to the localhost port chosen in §0.

---

## 6. Update `rndpig.com` landing page

Add a card to `rndpig-landing/index.html` (between the existing project cards):

```html
<a href="https://<name>.rndpig.com" class="project-card-link" target="_blank" rel="noopener noreferrer">
    <div class="project-card">
        <h3><Display Name></h3>
        <p><One-sentence description.></p>
        <span class="project-link">View Project →</span>
    </div>
</a>
```

Then commit + push:

```powershell
cd "C:\Users\rndpi\Documents\Coding Projects\rndpig-landing"
git add index.html
git commit -m "Add <name> card to landing page"
git push
```

GitHub Pages auto-deploys from `main`. Verify at https://rndpig.com.

---

## 7. End-to-end smoke test

```powershell
# DNS
Resolve-DnsName <name>.rndpig.com
Resolve-DnsName <name>-api.rndpig.com

# Frontend
Invoke-WebRequest -UseBasicParsing https://<name>.rndpig.com -Method Head | Select-Object StatusCode

# Backend
Invoke-WebRequest -UseBasicParsing https://<name>-api.rndpig.com/health | Select-Object -ExpandProperty Content

# Tunnel + service health on dilger
ssh -n -T dilger "sudo systemctl status cloudflared --no-pager | head -10"
ssh -n -T dilger "curl -s http://localhost:<backend-port>/health"
```

Open the new app in a browser, sign in with Google, confirm you can hit an authenticated endpoint.

---

## 8. Capture what you learned

When you finish, update **this file** with anything that surprised you (port conflicts, Cloudflare flags, Firebase quirks). Then update each affected project's `.github/copilot-instructions.md` with:

- The new subdomain and port
- A pointer back to this playbook

---

## Reference: existing tunnel ingress (as of 2026-05-31)

```yaml
tunnel: 48dab637-7544-4bb0-a38a-58e058145490
ingress:
  - hostname: deer-api.rndpig.com       # 8000 — deer-deterrent backend
  - hostname: network-api.rndpig.com    # 8002 — network-monitor backend
  - hostname: network.rndpig.com        # 9080 — network-monitor frontend
  - hostname: weather-api.rndpig.com    # 8003 — weather-monitor backend
  - hostname: weather.rndpig.com        # 8080 — weather-monitor frontend
  - service: http_status:404
```

`deer.rndpig.com` and `dinner.rndpig.com` route to Firebase Hosting directly via Cloudflare CNAMEs and don't need tunnel ingress.

---

## Reference: which projects already follow this pattern

| Subdomain | Frontend host | Backend host | Auth |
|---|---|---|---|
| deer.rndpig.com | Firebase (`deer-deterrent-rnp`) | dilger:8000 (Docker) | Firebase + INTERNAL_API_KEY |
| weather.rndpig.com | Firebase (`weather-monitor-rnp`) | dilger:8003 (systemd) | (currently public) |
| network.rndpig.com | dilger:9080 (Docker) | dilger:8002 | Firebase |
| lawn.rndpig.com | Firebase (`lawn-rnp`) — *planned* | dilger:8004 (systemd) — *scaffold only* | Firebase + INTERNAL_API_KEY |
| dinner.rndpig.com | Firebase | — | — |
| dept56.rndpig.com | Firebase | — | — |
| rndpig.com | GitHub Pages | — | — |
