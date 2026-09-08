#!/usr/bin/env node
/*
 * Build every app's Home Screen icon set.
 *
 *   node scripts/icons/build-icons.mjs            # write PNGs into each app
 *   node scripts/icons/build-icons.mjs --preview  # contact sheet only, no writes
 *   node scripts/icons/build-icons.mjs --only grocery-list
 *
 * Glyphs come from lucide-static (ISC), the same set the apps use in their UI,
 * plus @tabler/icons (MIT) for the one glyph lucide lacks. Both draw on a
 * 24-unit grid with 2px round caps, so they mix without adjustment.
 *
 * Run from the rndpig-landing repo root. Writes into sibling repos, which is
 * deliberate: one system, seven apps, and keeping the source in seven places is
 * how they drift apart.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

import { APPS, GROUND, GLYPH_SCALE, STROKE, SIZES } from './icons.config.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '../..')
const PORTFOLIO = resolve(REPO, '..')
const SETS = {
  lucide: resolve(REPO, 'node_modules/lucide-static/icons'),
  tabler: resolve(REPO, 'node_modules/@tabler/icons/icons/outline'),
}

const args = process.argv.slice(2)
const previewOnly = args.includes('--preview')
const onlyIdx = args.indexOf('--only')
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null

/** "lucide/sun" -> that icon's drawing commands, wrapper removed. */
function glyphInner(ref) {
  const [set, name] = ref.split('/')
  const dir = SETS[set]
  if (!dir) throw new Error(`unknown icon set "${set}" in "${ref}"`)
  const file = join(dir, `${name}.svg`)
  if (!existsSync(file)) throw new Error(`${set} has no icon "${name}"`)
  return (
    readFileSync(file, 'utf8')
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')
      // Tabler opens every icon with a transparent 24x24 rect as a bounding
      // box. Ours is a stroked group, so that rect would paint a full-tile
      // square in the accent color.
      .replace(/<path\s+stroke="none"[^>]*\/>/g, '')
      // Both sets put stroke-width on the <svg>; children inherit it. We set
      // ours on the group, so strip local overrides that would win.
      .replace(/\sstroke-width="[^"]*"/g, '')
      .trim()
  )
}

/**
 * Compose one icon. The glyph is drawn in lucide's 24-unit space and then
 * placed by a single transform, so its stroke weight is identical in every
 * icon regardless of the output size.
 */
function iconSVG(app, px) {
  const inner = glyphInner(app.glyph)
  const box = px * GLYPH_SCALE
  const offset = (px - box) / 2
  const scale = box / 24

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="42%" r="58%">
      <stop offset="0%" stop-color="${app.glow}" stop-opacity="0.30" />
      <stop offset="55%" stop-color="${app.glow}" stop-opacity="0.10" />
      <stop offset="100%" stop-color="${app.glow}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${px}" height="${px}" fill="${GROUND}" />
  <rect width="${px}" height="${px}" fill="url(#glow)" />
  <g transform="translate(${offset} ${offset}) scale(${scale})"
     fill="none"
     stroke="${app.color}"
     stroke-width="${STROKE}"
     stroke-linecap="round"
     stroke-linejoin="round">
      ${inner}
  </g>
</svg>`
}

async function writeApp(app) {
  const outDir = join(PORTFOLIO, app.out)
  if (!existsSync(outDir)) {
    // Vite only creates public/ if you make one, and several apps never had a
    // static asset to put there. Create it, but only inside a frontend that
    // exists — never invent a tree for an app that is not checked out.
    const frontend = dirname(outDir)
    if (!existsSync(frontend)) {
      console.log(`  ! ${app.id}: no ${app.out.split('/').slice(0, -1).join('/')}, skipped`)
      return false
    }
    mkdirSync(outDir, { recursive: true })
    console.log(`  · ${app.id}: created ${app.out}`)
  }
  for (const { file, px } of SIZES) {
    const png = await sharp(Buffer.from(iconSVG(app, px))).png({ compressionLevel: 9 }).toBuffer()
    writeFileSync(join(outDir, file), png)
  }
  console.log(`  + ${app.id}: ${SIZES.map((s) => s.file).join(', ')}`)
  return true
}

/** A contact sheet at real Home Screen size, for judging them side by side. */
function previewHTML(apps) {
  const tiles = apps
    .map((app) => {
      const svg = Buffer.from(iconSVG(app, 512)).toString('base64')
      return `<figure>
        <img src="data:image/svg+xml;base64,${svg}" alt="${app.label}" />
        <figcaption>${app.label}</figcaption>
      </figure>`
    })
    .join('\n')

  return `<!doctype html><meta charset="utf-8"><title>Home Screen icons</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 40px 28px; background: #0b0b0d; color: #e8e8ea;
         font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  h1 { font-size: 19px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
  p  { margin: 0 0 30px; color: #9a9aa2; font-size: 13.5px; }
  .sheet { display: flex; flex-wrap: wrap; gap: 30px 26px; }
  figure { margin: 0; width: 60px; text-align: center; }
  /* 60px is the real rendered size on an iPhone Home Screen, and the squircle
     is iOS's own corner curve, so this is what the family actually looks like. */
  img { width: 60px; height: 60px; border-radius: 23%; display: block; }
  figcaption { margin-top: 7px; font-size: 11px; color: #c8c8cf; }
  .big { margin-top: 44px; }
  .big img { width: 128px; height: 128px; border-radius: 23%; }
  .big figure { width: 128px; }
</style>
<h1>Home Screen icons</h1>
<p>Top row at 60&nbsp;px, the size iOS actually renders. Below at 128&nbsp;px to judge the drawing.</p>
<div class="sheet">${tiles}</div>
<div class="sheet big">${tiles}</div>`
}

const chosen = only ? APPS.filter((a) => a.id === only) : APPS
if (!chosen.length) {
  console.error(`No app matched --only ${only}`)
  process.exit(1)
}

const sheetPath = join(HERE, 'preview.html')
writeFileSync(sheetPath, previewHTML(chosen))
console.log(`Contact sheet: ${sheetPath}`)

if (previewOnly) {
  console.log('Preview only; no PNGs written.')
} else {
  console.log('Writing icons:')
  let n = 0
  for (const app of chosen) if (await writeApp(app)) n++
  console.log(`\n${n}/${chosen.length} apps updated.`)
}
