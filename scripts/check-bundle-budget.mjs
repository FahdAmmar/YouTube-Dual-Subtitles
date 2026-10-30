// Fails the build when what the FIRST page downloads grows past its budget.
// "First page" = the scripts and stylesheets index.html loads (and preloads) itself; lazy chunks (the watch screen,
// reading mode, panels) are checked against their own, larger budgets.
// Sizes are gzip level 9, the closest stand-in for what a CDN sends. Run after `npm run build`.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST = 'dist'
const KB = 1024

// Measured at the time of writing (gzip, 1 KB = 1024 bytes): first-page JS 71.5 KB, CSS 12.4 KB, watch screen 52.7 KB,
// reading mode 9.9 KB. Before the watch screen was split out the first-page JS was 115.5 KB.
// The budgets leave roughly 15% headroom. Raising one should be a deliberate, reviewed decision, not a side effect.
const BUDGETS = {
  firstPageJs: 85 * KB,
  firstPageCss: 16 * KB,
  /** Largest allowed size of any single lazy chunk, by file-name prefix */
  lazyChunks: { WatchScreen: 62 * KB, ReadingView: 14 * KB, GlossaryPanel: 10 * KB, SettingsPanel: 9 * KB, domAnimationFeatures: 22 * KB },
}

const gzipSize = (file) => gzipSync(readFileSync(join(DIST, file)), { level: 9 }).length
const format = (bytes) => `${(bytes / KB).toFixed(1)} KB`

const html = readFileSync(join(DIST, 'index.html'), 'utf8')
const assetsOf = (pattern) => [...html.matchAll(pattern)].map((match) => match[1].replace(/^\//, ''))
const firstPageJs = [
  ...assetsOf(/<script[^>]*\ssrc="([^"]+\.js)"/g),
  ...assetsOf(/<link[^>]*rel="modulepreload"[^>]*\shref="([^"]+\.js)"/g),
]
const firstPageCss = assetsOf(/<link[^>]*rel="stylesheet"[^>]*\shref="([^"]+\.css)"/g)
const unique = (list) => [...new Set(list)]

const failures = []
function check(label, files, budget) {
  const total = unique(files).reduce((sum, file) => sum + gzipSize(file), 0)
  const ok = total <= budget
  console.log(`${ok ? '✓' : '✗'} ${label}: ${format(total)} of ${format(budget)}`)
  if (!ok) failures.push(label)
}

check('first-page JavaScript', firstPageJs, BUDGETS.firstPageJs)
check('first-page CSS', firstPageCss, BUDGETS.firstPageCss)

const lazyFiles = readdirSync(join(DIST, 'assets')).filter((file) => file.endsWith('.js'))
for (const [prefix, budget] of Object.entries(BUDGETS.lazyChunks)) {
  const matches = lazyFiles.filter((file) => file.startsWith(`${prefix}-`))
  if (matches.length === 0) {
    console.log(`? lazy chunk ${prefix}: not found (renamed or merged?). Update scripts/check-bundle-budget.mjs`)
    failures.push(`${prefix} missing`)
    continue
  }
  for (const file of matches) check(`lazy chunk ${file}`, [`assets/${file}`], budget)
}

if (failures.length > 0) {
  console.error(`\nBundle budget exceeded: ${failures.join(', ')}`)
  process.exit(1)
}
