/*
 * One Home Screen icon per app, drawn from one system.
 *
 * The problem this solves: none of the apps except grocery declared an
 * apple-touch-icon, so iOS fell back to generating its own — the black tile
 * with a single white letter that made seven apps look like the same app.
 *
 * The system, in one sentence: one stroke glyph in the app's own accent color,
 * on a shared near-black ground lit from behind by that same color.
 *
 * Cohesion comes from everything except the hue being identical — the ground,
 * the glow, the stroke weight, the optical size of the glyph, the drawing hand
 * (lucide, which the apps already use for their own UI, plus Tabler for the one
 * glyph lucide lacks; both draw on a 24-unit grid with round caps).
 * Differentiation comes from hue plus silhouette together, which is what makes
 * them separable at 60px on a crowded Home Screen: hue alone fails for anyone
 * with color-vision deficiency, and silhouette alone fails at a glance.
 *
 * Hues are not invented here. Each is the accent the app already ships, so the
 * icon and the app agree. They happen to spread reasonably around the wheel;
 * where two sat close, the silhouettes are unmistakably different.
 */

/** Shared ground. Lifted off pure black so the icon still reads as an object
 *  on a black wallpaper rather than dissolving into it. */
export const GROUND = '#141416'

/** The glyph occupies this fraction of the canvas. iOS masks icons to a
 *  squircle and crops roughly 10% per side, so this leaves real margin. */
export const GLYPH_SCALE = 0.5

/** Stroke width in lucide's own 24-unit space. Lucide ships 2; at Home Screen
 *  size that goes spindly, and 2.4 holds up without looking heavy. */
export const STROKE = 2.4

export const SIZES = [
  { file: 'icon-180.png', px: 180 }, // apple-touch-icon
  { file: 'icon-192.png', px: 192 }, // manifest
  { file: 'icon-512.png', px: 512 }, // manifest, splash
]

/**
 * `glyph` is "<set>/<name>", where set is `lucide`, `tabler`, or `local`
 *   (scripts/icons/glyphs — marks that are ours rather than a library's).
 * `color` is the app's own accent, in OKLCH, as the icon's stroke.
 * `glow` is that hue at low alpha behind the glyph.
 * `html` optionally names the directory holding the index.html to wire, for a
 *   site that serves its icons from the same directory as its markup rather
 *   than from a `frontend/public`. Defaults to the parent of `out`.
 */
export const APPS = [
  {
    // The launcher itself was missing from this list, so rndpig.com was the one
    // tile on the Home Screen still showing iOS's generated square — the exact
    // problem this system exists to fix.
    id: 'rndpig-landing',
    label: 'rndpig',
    // GitHub Pages serves this repo's root, so the PNGs and the markup are
    // siblings; there is no frontend/public to write into.
    out: 'rndpig-landing',
    html: 'rndpig-landing',
    // The one place pink is allowed (owner decision 2026-07-04): it appears
    // only on the snout mark, and this tile is nothing but the snout mark.
    // `--snout-pink` from css/styles.css, unchanged.
    color: 'oklch(0.78 0.10 356)',
    glow: 'oklch(0.70 0.12 356)',
    glyph: 'local/snout',
  },
  {
    id: 'deer-deterrent',
    label: 'Deer',
    out: 'deer-deterrent/frontend/public',
    color: 'oklch(0.68 0.17 256)',
    glow: 'oklch(0.60 0.19 256)',
    // Lucide has no deer; Tabler does, drawn on the same 24-unit grid with
    // the same round caps, so it drops into the family unaltered.
    glyph: 'tabler/deer',
  },
  {
    id: 'weather-monitor',
    label: 'Weather',
    out: 'weather-monitor/frontend/public',
    color: 'oklch(0.84 0.15 88)',
    glow: 'oklch(0.80 0.15 88)',
    glyph: 'lucide/cloud-sun',
  },
  {
    id: 'lawn-control',
    label: 'Lawn',
    out: 'lawn-control/frontend/public',
    color: 'oklch(0.70 0.16 150)',
    glow: 'oklch(0.62 0.15 150)',
    glyph: 'lucide/sprout',
  },
  {
    id: 'home-maintenance',
    label: 'Home',
    out: 'home-maintenance/frontend/public',
    color: 'oklch(0.72 0.20 305)',
    glow: 'oklch(0.64 0.22 305)',
    glyph: 'lucide/house',
  },
  {
    id: 'network-monitor',
    label: 'Network',
    out: 'network-monitor/frontend/public',
    color: 'oklch(0.72 0.13 195)',
    glow: 'oklch(0.60 0.13 195)',
    glyph: 'lucide/wifi',
  },
  {
    id: 'health-monitor',
    label: 'Health',
    out: 'health-monitor/frontend/public',
    color: 'oklch(0.72 0.17 15)',
    glow: 'oklch(0.65 0.19 15)',
    glyph: 'lucide/heart-pulse',
  },
  {
    id: 'grocery-list',
    label: 'Grocery',
    out: 'grocery-list/frontend/public',
    // The app's own accent is the store you are shopping, so there is no one
    // brand color to borrow. Warm orange sits in the widest gap left on the
    // wheel — far enough from health's rose and weather's gold to separate.
    color: 'oklch(0.76 0.16 55)',
    glow: 'oklch(0.68 0.17 55)',
    glyph: 'lucide/shopping-bag',
  },
]
