#!/usr/bin/env node
// PreToolUse guard for Edit / Write / MultiEdit.
//
// Blocks edits to files that must never be changed by hand. Exit code 2 blocks the call and
// feeds stderr back to Claude. Paths are resolved against the project root and compared
// with forward slashes, so the same rules apply on Windows.
import { readFileSync } from 'node:fs'
import path from 'node:path'

let payload
try {
  payload = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0) // Malformed input: fail open rather than block all work.
}

const target = payload?.tool_input?.file_path ?? payload?.tool_input?.path
if (typeof target !== 'string' || target === '') process.exit(0)

const root = process.env.CLAUDE_PROJECT_DIR || payload?.cwd || process.cwd()
const rel = path.relative(root, path.resolve(root, target)).split(path.sep).join('/')
if (rel.startsWith('..')) process.exit(0) // Outside the project: Claude Code's own permission prompt applies.

const protectedPaths = [
  [rel === 'package-lock.json', 'Change dependencies with `npm install` / `npm uninstall`; never hand-edit the lockfile.'],
  [/^\.env(\..+)?$/.test(rel) && rel !== '.env.example', 'Environment files are off limits; this app needs no secrets or API keys.'],
  [/^(node_modules|dist|\.git)\//.test(rel), 'Generated or VCS-internal directory; change the source and rebuild instead.'],
]

for (const [matches, why] of protectedPaths) {
  if (matches) {
    process.stderr.write(`Blocked by .claude/hooks/protect-files.mjs: ${rel}. ${why}\n`)
    process.exit(2)
  }
}
process.exit(0)
