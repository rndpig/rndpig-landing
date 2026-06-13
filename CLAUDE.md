# CLAUDE.md — rndpig-landing
# Last Updated: 2026-06-06

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
├── index.html           # Single-page HTML (~95 lines)
├── css/styles.css       # All styles, dark theme, CSS variables (~385 lines)
├── js/script.js         # Smooth scroll, parallax, active nav (~55 lines)
├── favicon.svg          # Pig snout SVG favicon
├── wordmark.svg / .jpg  # Logo
├── CNAME                # GitHub Pages custom domain
├── admin/               # Static admin UI for allowlist management (calls admin-api.rndpig.com)
└── docs/
    ├── SUBDOMAIN_SETUP.md   # End-to-end subdomain provisioning playbook
    └── LAWN_APP_PLAN.md     # Migration plan for lawn-control
```

---

## Linked Projects

| App | URL |
|-----|-----|
| Dinner Spinner | dinner.rndpig.com |
| Deer Deterrent | deer.rndpig.com |
| Network Monitor | network.rndpig.com |
| Weather Monitor | weather.rndpig.com |
| Dept56 Gallery | dept56.rndpig.com |

When `lawn.rndpig.com` ships, add a card for it to `index.html`.

---

## Design Conventions

- **Dark-first palette**: CSS variables in `:root` (`--bg-primary: #0a0a0f`), no light mode
- **Card hover effects**: Gradient border reveal (`::before`), glow (`::after` blur), `translateY(-6px)` lift
- **Fixed header**: `backdrop-filter: blur(20px)`
- **2-column grid** for project cards, collapses to 1-column at 768px
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
