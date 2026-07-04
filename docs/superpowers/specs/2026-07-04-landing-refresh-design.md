# rndpig.com Landing Refresh — Design Spec
**Date:** 2026-07-04 · **Status:** approved (owner picked direction via question round)

## Goal

Bring the landing page current (add home-maintenance card) and modernize it as a
compact, mobile-first launcher whose branding centers on the rndpig handle
(snout mark), replacing the blue accent with a muted pig-pink.

## Owner decisions (2026-07-04)

1. **Pink = snout logo ONLY; blue = interactive accent.** A full pig-pink
   accent was built first, then the owner revised mid-build: "I don't like the
   pink accents around each card, so go back to blue and we'll only pull in
   pink at the top with the snout logo." Cards, glyphs, arrows, and hovers use
   blue (`oklch(0.70 0.14 259)`); the snout mark uses `--snout-pink`
   (`oklch(0.78 0.10 356)` ≈ `#eb9db3`) in the header, favicon, wordmark, and
   admin brand.
2. **No hero** — the generic "Welcome" section is removed; the app grid starts
   immediately under a slim header.
3. **Line-art SVG glyphs** — each app card gets a custom minimal stroke icon in
   the accent color (not emoji).
4. **Snout geometry from real reference photos** (owner-supplied): squircle
   disc, wider than tall — not an ellipse — with two vertical-oval nostrils set
   slightly low and tilted ~15° outward.

## Scope

| File | Change |
|---|---|
| `index.html` | Drop hero; inline brand (text + snout SVG) replaces `wordmark.svg` img; add Home Maintenance card (home.rndpig.com) after Lawn; horizontal launcher-row cards with inline stroke glyphs; drop `js/script.js` (no JS needed); footer refresh |
| `css/styles.css` | New token set (OKLCH): cool dark ground, blue interactive accent, `--snout-pink` for the logo only; Gabarito replaces Inter (reflex-reject list); launcher-row card layout, `auto-fit minmax` grid; CSS-only entrance stagger + `prefers-reduced-motion` fallback; remove gradient-text and glow gimmicks |
| `favicon.svg` | Pink snout (new geometry) on dark rounded square |
| `wordmark.svg` | Pink snout + Gabarito text (kept as a standalone brand asset) |
| `admin/index.html` | Replace 🐷 with the same inline snout mark (pink); interactive colors stay blue |
| `js/script.js` | Deleted (smooth-scroll/parallax served the old hero; page has no anchors) |
| `CLAUDE.md` | Update linked-projects table (add lawn, home), design conventions (pink, Gabarito, no hero) |

Out of scope: admin functionality, docs/, provisioning scripts, GA tag, DNS.

## Card inventory (order preserved from current site, home slotted after lawn)

Dinner Spinner · Deer Deterrent · Weather Monitor · Lawn Control ·
**Home Maintenance (new, https://home.rndpig.com)** · Network Monitor · Dept56 Gallery

## Card anatomy (avoids the centered icon-heading-text template)

Horizontal row: `[glyph tile] [name + one-line description + domain slug] [→]`,
whole card is the link. Desktop: 2-up via `repeat(auto-fit, minmax(300px, 1fr))`;
mobile: single column. Hover: border shifts to pink, subtle lift; focus-visible
ring for keyboard.

## Glyphs (24×24, stroke 1.75, round caps, currentColor)

deer = antlered head · weather = sun behind cloud · lawn = sprouting blades ·
home = house + wrench · network = wifi arcs · dinner = plate + cutlery ·
dept56 = bauble ornament (collectible villages)

## Process notes

- Deploy = merge to main (GitHub Pages auto-deploy). Merge pre-approved
  (standing grant 2026-06-30); owner requested this update explicitly.
- Standing step added to `new-app-bootstrap` skill: every new app adds a card
  here as part of shipping.
