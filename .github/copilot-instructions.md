# rndpig.com Landing Page — Copilot Instructions
# Last Updated: 2026-04-18

## Project Overview

Minimalist dark-themed portfolio landing page at **rndpig.com** that serves as the central hub linking to 5 project subdomains.

**Owner**: rndpig on GitHub
**Repository**: https://github.com/rndpig/rndpig-landing.git (private)
**Live site**: https://rndpig.com

### Linked Projects

| App | URL |
|-----|-----|
| Dinner Spinner | dinner.rndpig.com |
| Deer Deterrent | deer.rndpig.com |
| Network Monitor | network.rndpig.com |
| Weather Monitor | weather.rndpig.com |
| Dept56 Gallery | dept56.rndpig.com |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Markup | Single-page HTML5 (`index.html`, ~95 lines) |
| Styling | Vanilla CSS (`css/styles.css`, ~385 lines) — dark theme, CSS custom properties |
| JavaScript | Vanilla JS (`js/script.js`, ~55 lines) — smooth scroll, parallax, active nav |
| Font | Inter via Google Fonts CDN |
| Build | None — static files served directly |
| Dev server | `python -m http.server 8000` or `npx http-server` |

**Zero-dependency static site.** `package.json` exists for metadata only (single devDependency `http-server` for local preview).

---

## Deployment

- **Hosting**: GitHub Pages, deployed from `main` branch root
- **Domain**: `rndpig.com` via GoDaddy DNS → GitHub Pages A records (185.199.108-111.153)
- **CNAME file**: Contains `rndpig.com`
- **SSL**: Automatic via GitHub Pages (Enforce HTTPS)
- **Deploy**: `git push` to `main` → auto-deploy
- **No CI/CD, no Firebase, no Docker**

---

## File Structure

```
rndpig-landing/
├── index.html           # Single-page HTML
├── css/styles.css       # All styles, dark theme, CSS variables
├── js/script.js         # Smooth scroll, parallax, active nav
├── favicon.svg          # Pig snout SVG favicon
├── wordmark.svg         # Logo wordmark (header)
├── wordmark.jpg         # Logo fallback
├── CNAME                # GitHub Pages custom domain
├── package.json         # Metadata only
├── README.md
└── DEPLOYMENT.md        # GitHub Pages + GoDaddy setup guide
```

---

## Design Conventions

- **Dark-first palette**: CSS variables in `:root` (`--bg-primary: #0a0a0f`), no light mode
- **Card hover effects**: Gradient border reveal (`::before` mask), glow (`::after` blur), `translateY(-6px)` lift
- **Fixed header**: Blur backdrop (`backdrop-filter: blur(20px)`)
- **2-column grid** for project cards, collapses to 1-column at 768px
- **All project links**: `target="_blank" rel="noopener noreferrer"`
- **Contact**: `mailto:rndpig@gmail.com` in nav

---

## Cross-Project Workflows

This repo hosts shared playbooks consumed by every `*.rndpig.com` app:

- [`docs/SUBDOMAIN_SETUP.md`](../docs/SUBDOMAIN_SETUP.md) — end-to-end subdomain provisioning (Cloudflare tunnel + Firebase Hosting + Firebase Auth). Apex `rndpig.com` DNS is GoDaddy → GitHub Pages, but **all subdomains are managed in Cloudflare** (no GoDaddy changes needed).
- [`docs/LAWN_APP_PLAN.md`](../docs/LAWN_APP_PLAN.md) — plan for `lawn.rndpig.com` (`lawn-control` repo), the central property intelligence hub.

When `lawn.rndpig.com` ships, add a card for it to `index.html`.

---

## Important Notes

1. **No build step** — edit files directly, push to deploy
2. **Single page** — entire site is one `index.html`
3. **When adding a new project**, add a card to the grid in `index.html` and update the nav if needed
4. **Subdomain pattern**: All apps live on `*.rndpig.com` — DNS managed in GoDaddy
5. **Google Analytics**: All apps share measurement ID `G-JKFNH6HFHQ`. Every new app's `index.html` must include this snippet inside `<head>`:
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
6. **Auth**: All apps use the `rndpig-admin` Firebase project (`project-191989121826`) for Google sign-in. Token verification uses `FIREBASE_PROJECT_ID=rndpig-admin`. Email allowlist is centralized at `admin-api.rndpig.com` (rndpig-identity service, port 8005 on dilger). Feature backends fetch the allowlist via `X-API-Key` every 60s with local `ALLOWED_EMAILS` as fallback. Only `rndpig@gmail.com` may add/delete allowlist entries.
7. **Admin UI**: `rndpig.com/admin/` manages the allowlist. Settings gear icon in the landing page nav links there.
