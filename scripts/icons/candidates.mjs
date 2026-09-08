#!/usr/bin/env node
/*
 * Render one app's tile with several candidate glyphs, side by side, so a
 * choice can be made by looking instead of by describing.
 *
 *   node scripts/icons/candidates.mjs deer-deterrent
 *
 * Written after five rounds of hand-authoring an antler glyph, none of which
 * converged. Comparing finished tiles takes one round.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { APPS, GROUND, GLYPH_SCALE, STROKE } from './icons.config.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '../..')

const SETS = {
  lucide: resolve(REPO, 'node_modules/lucide-static/icons'),
  tabler: resolve(REPO, 'node_modules/@tabler/icons/icons/outline'),
}

/** "tabler/deer" -> the drawing commands, wrapper and placeholder rect removed. */
function glyphInner(ref) {
  const [set, name] = ref.split('/')
  const file = join(SETS[set], `${name}.svg`)
  if (!existsSync(file)) throw new Error(`no ${ref}`)
  return readFileSync(file, 'utf8')
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    // Tabler ships a transparent 24x24 rect first; it would fill our tile.
    .replace(/<path\s+stroke="none"[^>]*\/>/g, '')
    .replace(/\sstroke-width="[^"]*"/g, '')
    .trim()
}

function tile(app, ref, px = 128) {
  const box = px * GLYPH_SCALE
  const offset = (px - box) / 2
  const scale = box / 24
  const uid = ref.replace(/\W/g, '')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
    <defs><radialGradient id="g${uid}" cx="50%" cy="42%" r="58%">
      <stop offset="0%" stop-color="${app.glow}" stop-opacity="0.30"/>
      <stop offset="55%" stop-color="${app.glow}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${app.glow}" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="${px}" height="${px}" fill="${GROUND}"/>
    <rect width="${px}" height="${px}" fill="url(#g${uid})"/>
    <g transform="translate(${offset} ${offset}) scale(${scale})" fill="none"
       stroke="${app.color}" stroke-width="${STROKE}"
       stroke-linecap="round" stroke-linejoin="round">${glyphInner(ref)}</g>
  </svg>`
}

const appId = process.argv[2] || 'deer-deterrent'
const app = APPS.find((a) => a.id === appId)
if (!app) throw new Error(`no app ${appId}`)

const CANDIDATES = {
  'deer-deterrent': [
    ['tabler/deer', 'Deer — head and antlers'],
    ['lucide/cctv', 'Camera — what it actually is'],
    ['lucide/radar', 'Radar — detection'],
    ['lucide/scan-eye', 'Scan — watching'],
    ['tabler/paw', 'Paw — animal, generic'],
  ],
}

const list = CANDIDATES[appId] || []
const row = (px, cls) =>
  list
    .map(
      ([ref, label]) => `<figure class="${cls}">
        <img src="data:image/svg+xml;base64,${Buffer.from(tile(app, ref, 512)).toString('base64')}"
             style="width:${px}px;height:${px}px" alt="${label}" />
        <figcaption>${label}<br><code>${ref}</code></figcaption>
      </figure>`
    )
    .join('\n')

writeFileSync(
  join(HERE, 'candidates.html'),
  `<!doctype html><meta charset="utf-8"><title>${app.label} candidates</title>
<style>
 :root{color-scheme:dark}
 body{margin:0;padding:36px 26px;background:#0b0b0d;color:#e8e8ea;
      font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
 h1{font-size:18px;margin:0 0 4px} p{margin:0 0 26px;color:#9a9aa2;font-size:13px}
 .sheet{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start}
 figure{margin:0;text-align:center;width:140px}
 img{border-radius:23%;display:block;margin:0 auto}
 figcaption{margin-top:8px;font-size:11.5px;color:#c8c8cf;line-height:1.4}
 code{color:#8f8f98;font-size:10.5px}
 .small figure{width:70px} .small figcaption{font-size:10px}
</style>
<h1>${app.label}: which glyph?</h1>
<p>Top at 128&nbsp;px to judge the drawing, below at 60&nbsp;px — the size iOS actually renders.</p>
<div class="sheet">${row(128, 'big')}</div>
<div class="sheet small" style="margin-top:34px">${row(60, 'small')}</div>`
)
console.log(`Wrote ${join(HERE, 'candidates.html')}`)
