#!/usr/bin/env node
/*
 * Make Home Screen icons cacheable-but-replaceable, and bust what is already
 * stuck in Cloudflare.
 *
 *   node scripts/icons/fix-caching.mjs [--dry]
 *
 * Two separate problems, both caused by one rule.
 *
 * Every app ships `**\/*.@(js|css|png|...)` with `max-age=31536000, immutable`.
 * That is exactly right for Vite's build output, whose filenames contain a
 * content hash, so a changed file is a new URL. It is wrong for icon-180.png,
 * whose name never changes: promising a year of immutability for a file we
 * intend to replace means the replacement is never fetched.
 *
 * 1. Future: a narrower rule for icon-*.png with a one-hour max-age, so the
 *    next icon change propagates on its own.
 * 2. Now: the year-long entry Cloudflare already holds cannot be evicted by
 *    changing headers — only by purging (which our API token is not scoped
 *    for) or by asking for a different URL. So the href gets ?v=N. Bump it
 *    whenever the artwork changes.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { APPS } from './icons.config.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PORTFOLIO = resolve(HERE, '../../..')
const dry = process.argv.includes('--dry')

/** Bump when the artwork changes, so viewers ask for a URL nobody has cached. */
const VERSION = 2

const ICON_RULE = {
  source: '**/icon-*.png',
  headers: [{ key: 'Cache-Control', value: 'max-age=3600' }],
}

let n = 0
for (const app of APPS) {
  const dir = join(PORTFOLIO, dirname(app.out))
  const htmlPath = join(dir, 'index.html')
  const fbPath = join(dir, 'firebase.json')
  const notes = []

  // --- hosting headers -----------------------------------------------------
  if (existsSync(fbPath)) {
    const fb = JSON.parse(readFileSync(fbPath, 'utf8'))
    const hosting = fb.hosting
    if (hosting) {
      hosting.headers ??= []
      const already = hosting.headers.some((h) => h.source === ICON_RULE.source)
      if (!already) {
        // Last wins in Firebase Hosting when two rules match the same path, so
        // this has to sit after the catch-all to override it.
        hosting.headers.push(structuredClone(ICON_RULE))
        if (!dry) writeFileSync(fbPath, JSON.stringify(fb, null, 2) + '\n')
        notes.push('header rule')
      }
    }
  }

  // --- cache-busting href --------------------------------------------------
  if (existsSync(htmlPath)) {
    let html = readFileSync(htmlPath, 'utf8')
    const before = html
    html = html.replace(/(href="\/icon-(?:180|192)\.png)(\?v=\d+)?"/g, `$1?v=${VERSION}"`)
    if (html !== before) {
      if (!dry) writeFileSync(htmlPath, html)
      notes.push(`?v=${VERSION}`)
    }
  }

  if (notes.length) {
    console.log(`  ${dry ? '~' : '+'} ${app.id}: ${notes.join(', ')}`)
    n++
  } else {
    console.log(`  = ${app.id}: already current`)
  }
}
console.log(`\n${n} app(s) ${dry ? 'would be' : ''} updated.`)
