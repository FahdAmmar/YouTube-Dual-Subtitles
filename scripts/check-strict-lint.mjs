// Ratchet for the stricter react-hooks rules: fails when a rule has MORE findings than the recorded baseline,
// so new code cannot add to the existing ones, and asks to lower the baseline when findings were fixed.
// Usage: npm run lint:strict            check against the baseline
//        npm run lint:strict -- --write  record the current counts as the new baseline
import { readFileSync, writeFileSync } from 'node:fs'
import { ESLint } from 'eslint'

const BASELINE_URL = new URL('./strict-lint-baseline.json', import.meta.url)
const ALREADY_IN_NORMAL_LINT = new Set(['react-hooks/rules-of-hooks', 'react-hooks/exhaustive-deps'])

const eslint = new ESLint({ overrideConfigFile: 'eslint.strict.config.js' })
const results = await eslint.lintFiles(['src'])

const counts = {}
for (const file of results) {
  for (const message of file.messages) {
    if (!message.ruleId?.startsWith('react-hooks/') || ALREADY_IN_NORMAL_LINT.has(message.ruleId)) continue
    counts[message.ruleId] = (counts[message.ruleId] ?? 0) + 1
  }
}

if (process.argv.includes('--write')) {
  writeFileSync(BASELINE_URL, `${JSON.stringify(sortKeys(counts), null, 2)}\n`)
  console.log('Baseline written:', counts)
  process.exit(0)
}

const baseline = JSON.parse(readFileSync(BASELINE_URL, 'utf8'))
const rules = [...new Set([...Object.keys(baseline), ...Object.keys(counts)])].sort()
let failed = false
let canLower = false

for (const rule of rules) {
  const now = counts[rule] ?? 0
  const allowed = baseline[rule] ?? 0
  if (now > allowed) {
    failed = true
    console.error(`✗ ${rule}: ${now} findings, baseline is ${allowed}. New code must not add to it.`)
  } else if (now < allowed) {
    canLower = true
    console.log(`↓ ${rule}: ${now} findings, baseline is ${allowed}. Run "npm run lint:strict -- --write" to lock the gain in.`)
  } else {
    console.log(`✓ ${rule}: ${now} (baseline)`)
  }
}

if (failed) {
  console.error('\nSee the findings with: npx eslint -c eslint.strict.config.js src')
  process.exit(1)
}
if (canLower) console.log('\nFewer findings than the baseline: good.')

function sortKeys(object) {
  return Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)))
}
