#!/usr/bin/env bash
# Blocks obviously destructive or risky commands before they run.
# Reads the tool-call JSON from stdin (Claude Code PreToolUse hook contract).

set -euo pipefail

input="$(cat)"
command=$(echo "$input" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 || true)

# Patterns that should never run unattended in this repo.
blocked_patterns=(
  "rm -rf /"
  "rm -rf \*"
  "git push --force"
  "git reset --hard"
  "npm publish"
  "> \.env"
)

for pattern in "${blocked_patterns[@]}"; do
  if echo "$command" | grep -qE "$pattern"; then
    echo "Blocked: command matches a protected pattern ('$pattern'). Ask the user first." >&2
    exit 2
  fi
done

exit 0
