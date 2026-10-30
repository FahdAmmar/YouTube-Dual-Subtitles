#!/usr/bin/env node
// PreToolUse guard for the Bash tool.
//
// Claude Code sends the tool call as JSON on stdin. Exit code 2 blocks the call and feeds
// stderr back to Claude; exit code 0 lets it through. This is a guardrail against accidents,
// not a security boundary: `permissions.deny` in settings.json is the second layer.
//
// Project rule: no git command runs unless the user asked for it. Set CLAUDE_ALLOW_GIT=1 (for example in the
// `env` block of .claude/settings.local.json) to authorise git; the destructive-git checks below still apply.
//
// Written in Node (already required by this repo) so it behaves the same on Windows, macOS
// and Linux and needs no `jq`.
import { readFileSync } from 'node:fs'

let command = ''
try {
  const payload = JSON.parse(readFileSync(0, 'utf8'))
  command = payload?.tool_input?.command ?? ''
} catch {
  process.exit(0) // Malformed input: fail open rather than block all work.
}
if (typeof command !== 'string' || command.trim() === '') process.exit(0)

/** Directories that are always safe to delete recursively (generated output only). */
const SAFE_RM_TARGETS = /^(\.\/)?(node_modules|dist|\.vite|coverage)\/?$/

/** Return a reason string when a single simple command must be blocked, else null. */
function inspectSegment(segment) {
  const tokens = segment.trim().split(/\s+/).filter(Boolean)
  while (tokens[0] === 'sudo' || /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0] ?? '')) tokens.shift()
  const [program, ...args] = tokens
  const flags = args.filter((t) => t.startsWith('-'))
  const operands = args.filter((t) => !t.startsWith('-'))
  const hasFlag = (...names) => flags.some((f) => names.includes(f))
  const hasShort = (letter) => flags.some((f) => /^-[A-Za-z]+$/.test(f) && f.includes(letter))

  if (program === 'rm') {
    const recursive = hasShort('r') || hasShort('R') || hasFlag('--recursive')
    if (recursive && !operands.every((t) => SAFE_RM_TARGETS.test(t))) {
      return 'recursive `rm` outside node_modules/dist/.vite/coverage'
    }
  }

  if (program === 'git' && process.env.CLAUDE_ALLOW_GIT !== '1') {
    return 'git commands are not allowed unless the user explicitly asks for them (the user can authorise a session with CLAUDE_ALLOW_GIT=1)'
  }

  if (program === 'git') {
    // Skip global options such as `git -C <path>` to find the real subcommand.
    const rest = [...args]
    while (rest[0] === '-C' || rest[0] === '-c') rest.splice(0, 2)
    while (rest[0]?.startsWith('-')) rest.shift()
    const sub = rest[0]
    const subArgs = rest.slice(1)
    const has = (...names) => subArgs.some((a) => names.includes(a))
    const hasShortSub = (letter) => subArgs.some((a) => /^-[A-Za-z]+$/.test(a) && a.includes(letter))

    if (subArgs.includes('--no-verify')) return '`--no-verify` skips the repository hooks'
    if (sub === 'push' && (has('--force', '--force-with-lease', '--force-if-includes') || hasShortSub('f'))) {
      return 'force-push rewrites shared history'
    }
    if (sub === 'reset' && has('--hard')) return '`git reset --hard` discards uncommitted work'
    if (sub === 'clean' && hasShortSub('f')) return '`git clean -f` deletes untracked files'
    if ((sub === 'checkout' || sub === 'restore') && subArgs.some((a) => a === '.' || a === ':/')) {
      return 'discarding every working-tree change at once'
    }
  }

  if (program === 'npm') {
    const sub = args.filter((t) => !t.startsWith('-'))
    if (['publish', 'unpublish', 'deprecate'].includes(sub[0])) return `\`npm ${sub[0]}\` changes the public registry`
    if (sub[0] === 'audit' && sub[1] === 'fix' && hasFlag('--force')) {
      return '`npm audit fix --force` applies breaking upgrades automatically'
    }
  }
  return null
}

const reasons = []

for (const segment of command.split(/&&|\|\||;|\n/)) {
  const reason = inspectSegment(segment)
  if (reason) reasons.push(reason)
}

// Whole-command patterns that span pipes or redirections.
if (/\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z|da)?sh\b/.test(command)) {
  reasons.push('piping a downloaded script straight into a shell')
}
if (/>>?\s*\.env(?!\.example)(\.[\w.-]+)?(\s|$)/.test(command)) {
  reasons.push('writing to an .env file (this app needs no secrets)')
}

if (reasons.length > 0) {
  process.stderr.write(
    `Blocked by .claude/hooks/validate-bash.mjs: ${reasons.join('; ')}. ` +
      'Ask the user for explicit approval, or use a narrower, reversible command.\n',
  )
  process.exit(2)
}
process.exit(0)
