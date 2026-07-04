# CLAUDE.md — rndpig-landing
# Last Updated: 2026-07-04

## Project Overview

Minimalist dark-themed portfolio landing page at **rndpig.com**. Central hub linking to all project subdomains. Static HTML/CSS/JS — no framework, no build step. Hosts shared playbooks consumed by every `*.rndpig.com` project.

**Repo**: https://github.com/rndpig/rndpig-landing.git (private)  
**Live site**: https://rndpig.com  
**Hosting**: GitHub Pages — `git push` to `main` → auto-deploy. No Firebase, no Docker.  
**DNS**: `rndpig.com` apex → GoDaddy → GitHub Pages A records. **All subdomains managed in Cloudflare.**

---

## Why rndpig-identity is a Separate Repo

`rndpig-landing` is GitHub Pages — it can only serve static files. `rndpig-identity` is a Python FastAPI service on dilger. They work together: `rndpig.com/admin/` is a static UI that calls `admin-api.rndpig.com`. Do not merge the repos.

---

## Deployment

```bash
git add . ; git commit -m "..." ; git push   # triggers auto-deploy to GitHub Pages
```

No build step needed. Edit files directly.

---

## File Structure

```
rndpig-landing/
├── index.html           # Single-page app launcher (no JS — deleted js/script.js 2026-07-04)
├── css/styles.css       # All styles, OKLCH tokens, pig-pink dark theme
├── favicon.svg          # Snout mark on dark rounded square
├── wordmark.svg / .jpg  # Standalone brand asset (index uses inline HTML brand instead)
├── PRODUCT.md           # Impeccable design context (register: brand)
├── CNAME                # GitHub Pages custom domain
├── admin/               # Static admin UI for allowlist management (calls admin-api.rndpig.com)
└── docs/
    ├── superpowers/specs/   # Design specs (2026-07-04 landing refresh)
    ├── SUBDOMAIN_SETUP.md   # End-to-end subdomain provisioning playbook
    └── LAWN_APP_PLAN.md     # Migration plan for lawn-control
```

---

## Linked Projects

| App | URL |
|-----|-----|
| Dinner Spinner | dinner.rndpig.com |
| Deer Deterrent | deer.rndpig.com |
| Weather Monitor | weather.rndpig.com |
| Lawn Control | lawn.rndpig.com |
| Home Maintenance | home.rndpig.com |
| Network Monitor | network.rndpig.com |
| Dept56 Gallery | dept56.rndpig.com |

**Standing rule: every new app that ships gets a card in `index.html` as part of
its deploy** (also a checklist item in the user-level `new-app-bootstrap` skill).
The landing page is the compact portfolio view — it must never lag the portfolio.

---

## Design Conventions (refreshed 2026-07-04 — see docs/superpowers/specs/2026-07-04-landing-refresh-design.md)

- **Brand = the snout mark**: squircle disc + two tilted oval nostrils (drawn from
  real snout photos), in pig-pink, everywhere (header, favicon, admin). **Never
  the 🐷 emoji.**
- **Pink is the logo's color ONLY** (owner decision 2026-07-04): `--snout-pink:
  oklch(0.78 0.10 356)` (≈ `#eb9db3` in standalone SVGs) appears solely on the
  snout mark. All interactive UI (glyphs, hovers, buttons, links) uses the blue
  accent `oklch(0.70 0.14 259)`. OKLCH tokens in `:root`, cool dark ground, no
  light mode.
- **Typography**: Gabarito (Google Fonts), weight contrast 400–700.
- **No hero**: sticky header → app grid immediately. Launcher rows
  (glyph tile | name/desc/domain | arrow), whole card is the link.
- **Per-app line-art glyphs**: 24×24 stroke 1.75 round-cap `<symbol>`s in
  `index.html` — add one for each new app.
- **Grid**: `repeat(auto-fit, minmax(min(100%, 330px), 1fr))` — no breakpoint math.
- **Motion**: CSS-only entrance stagger; `prefers-reduced-motion` collapses it.
- **All project links**: `target="_blank" rel="noopener noreferrer"`

---

## Cross-Project Standards (authoritative source)

### Google Analytics

All apps share measurement ID `G-JKFNH6HFHQ`. Every new app's `index.html` must include inside `<head>`:
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-JKFNH6HFHQ"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-JKFNH6HFHQ');
</script>
```

### Authentication

- Firebase project: `rndpig-admin` (`project-191989121826`) for all apps
- Token verification: `FIREBASE_PROJECT_ID=rndpig-admin`
- Email allowlist: centralized at `admin-api.rndpig.com` (rndpig-identity, port 8005 on dilger)
- Feature backends fetch allowlist via `X-API-Key: INTERNAL_API_KEY` every 60s; fall back to local `ALLOWED_EMAILS` env
- Only `rndpig@gmail.com` may add/delete allowlist entries
- Admin UI: `rndpig.com/admin/` — settings gear icon in landing nav links there

### Subdomain Provisioning

See `docs/SUBDOMAIN_SETUP.md` for the full Cloudflare tunnel + Firebase Hosting + Firebase Auth playbook.

---

## Multi-Agent Workflow

**Claude = Architect/Reviewer | Codex = Builder.** See deer-deterrent `docs/handoff.md` and `docs/implementation_plan.md` for templates.

**Global subagents** (available in all projects): `architecture-scout`, `code-reviewer`, `test-runner`, `codex-handoff-writer`.

**Token tips:** `/compact` at ~50% context; `/clear` between unrelated tasks. Don't add MCP servers mid-session (breaks prompt cache).
