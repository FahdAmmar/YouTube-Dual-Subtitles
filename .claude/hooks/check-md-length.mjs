#!/usr/bin/env node
// Enforces the project rule "no Markdown file is longer than 200 lines".
//
//   PostToolUse hook : reads the tool call from stdin and checks the .md file that was just written.
//                      Exit code 2 feeds the message back to Claude so it splits the file.
//   Whole project    : `node .claude/hooks/check-md-length.mjs --all` (used by the verify skill); exit code 1 on offenders.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const MAX_LINES = 200
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-ssr', '.git', '.vite', '.vercel'])

/** Same count as `wc -l`: number of line breaks, plus one if the last line has none. */
function countLines(file) {
  const text = readFileSync(file, 'utf8')
  if (text === '') return 0
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
}

function* markdownFiles(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) yield* markdownFiles(full)
    else if (name.toLowerCase().endsWith('.md')) yield full
  }
}

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd()

if (process.argv.includes('--all')) {
  const offenders = []
  let checked = 0
  for (const file of markdownFiles(root)) {
    checked += 1
    const lines = countLines(file)
    if (lines > MAX_LINES) offenders.push(`${lines}\t${path.relative(root, file).split(path.sep).join('/')}`)
  }
  if (offenders.length > 0) {
    console.error(`Markdown files over ${MAX_LINES} lines:\n${offenders.join('\n')}`)
    process.exit(1)
  }
  console.log(`${checked} Markdown files checked, none over ${MAX_LINES} lines.`)
  process.exit(0)
}

let target
try {
  const payload = JSON.parse(readFileSync(0, 'utf8'))
  target = payload?.tool_input?.file_path ?? payload?.tool_input?.path
} catch {
  process.exit(0) // Malformed input: fail open.
}
if (typeof target !== 'string' || !target.toLowerCase().endsWith('.md')) process.exit(0)

const file = path.resolve(root, target)
const rel = path.relative(root, file).split(path.sep).join('/')
if (rel.startsWith('..') || rel.split('/').some((part) => SKIP_DIRS.has(part))) process.exit(0)

let lines
try {
  lines = countLines(file)
} catch {
  process.exit(0) // File not readable (for example a failed write): nothing to check.
}
if (lines > MAX_LINES) {
  process.stderr.write(
    `${rel} has ${lines} lines; the project limit is ${MAX_LINES}. Split it at a heading boundary into ` +
      'smaller files (for a skill: keep SKILL.md short and move the rest to references/) and link them.\n',
  )
  process.exit(2)
}
process.exit(0)
