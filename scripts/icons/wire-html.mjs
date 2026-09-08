#!/usr/bin/env node
/*
 * Declare the Home Screen icon in each app's index.html.
 *
 *   node scripts/icons/wire-html.mjs [--dry]
 *
 * Generating the PNGs is only half of it. iOS picks a Home Screen icon from
 * <link rel="apple-touch-icon"> and nothing else — it does not read a favicon,
 * and it ignores an SVG data-URI favicon entirely, which is exactly what every
 * app here had. With no apple-touch-icon it renders its own tile from the page,
 * which is where the black square with one white letter came from.
 *
 * Deliberately NOT added: apple-mobile-web-app-capable. That launches the app
 * without browser chrome, which is a real behaviour change — no back button, no
 * address bar — and none of these apps were built expecting it. grocery-list
 * opts in on its own because it was.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

import { APPS } from './icons.config.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PORTFOLIO = resolve(HERE, '../../..')
const dry = process.argv.includes('--dry')

const TAGS = [
  '<link rel="apple-touch-icon" href="/icon-180.png" />',
  '<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />',
]

let changed = 0
for (const app of APPS) {
  // An app keeps its icons in frontend/public and its markup one level up, so
  // the default is the parent of `out`. A static site that serves both from one
  // directory says so with `html`, because dirname() there would climb out of
  // the repo entirely.
  const html = join(PORTFOLIO, app.html ?? dirname(app.out), 'index.html')
  if (!existsSync(html)) {
    console.log(`  ! ${app.id}: no index.html`)
    continue
  }
  let src = readFileSync(html, 'utf8')

  if (src.includes('apple-touch-icon')) {
    console.log(`  = ${app.id}: already declared`)
    continue
  }

  // Sit alongside whatever icon link is already there; fall back to <head>.
  const anchor = src.match(/^[ \t]*<link rel="icon"[^\n]*\n/m)
  const indent = anchor ? anchor[0].match(/^[ \t]*/)[0] : '    '
  const block = TAGS.map((t) => indent + t).join('\n') + '\n'

  if (anchor) {
    src = src.replace(anchor[0], anchor[0] + block)
  } else {
    src = src.replace(/<head>\s*\n/, (m) => m + block)
  }

  if (dry) console.log(`  ~ ${app.id}: would add ${TAGS.length} tags`)
  else {
    writeFileSync(html, src)
    console.log(`  + ${app.id}: declared`)
  }
  changed++
}
console.log(`\n${changed} app(s) ${dry ? 'would be' : ''} updated.`)
