# `.claude/` — AI assistant configuration

Project-specific setup for Claude Code. Project-wide conventions live in `../CLAUDE.md`; this folder holds the
parts that are better split by purpose. Everything here is plain Markdown/JSON/Node and is committed to Git, except
`settings.local.json` (ignored) for personal overrides.

```
.claude
├── settings.json   permissions and hook wiring
├── agents/         sub-agents with one clear responsibility each
├── hooks/          deterministic guards (Node, no extra dependencies)
├── rules/          conventions; unscoped rules always load (including `workflow-and-delivery.md`), rules with `paths:` load for matching files
└── skills/         workflows and reference knowledge, one folder per skill (SKILL.md)
```

## Workflows (skills you invoke)

| Command | Use it when | Ends with |
|---|---|---|
| `/new-feature <what>` | adding or changing a feature, screen, setting or component | tests, docs, a `verify` report |
| `/fix-issue <bug>` | something is broken | root cause, a test seen failing then passing, a `verify` report |
| `/review [scope]` | before committing or merging | verdict plus a ✅ / ⚠️ / ❌ checklist |
| `/verify [quick\|full]` | before saying anything is done | a table of gates with real results |

`subtitle-parsing` is reference knowledge for the subtitle code. The other skills (`test-driven-development`,
`debugging-and-error-recovery`, `frontend-ui-engineering`, `code-review-and-quality`, `performance-optimization`,
`security-and-hardening`, `incremental-implementation`, `code-simplification`, `verification-before-completion`) are
copies of upstream skills the workflows build on; see `THIRD_PARTY_SKILLS.md`.

## Agents

| Agent | Responsibility |
|---|---|
| `code-reviewer` | correctness, architecture fit, conventions, tests |
| `security-auditor` | untrusted content, URL parsing, CSP drift, storage and backup |
| `accessibility-reviewer` | WCAG AA, keyboard and focus, contrast in both themes, RTL |

## Hooks

The two PreToolUse hooks block a call with exit code 2; they are guardrails against accidents, not a security
boundary (`permissions.deny` in `settings.json` is the second layer).

- `validate-bash.mjs` — blocks **every git command** unless the user authorised it with `CLAUDE_ALLOW_GIT=1`, and
  always blocks recursive `rm` outside `node_modules`/`dist`/`.vite`/`coverage`, force-push, `git reset --hard`,
  `git clean -f`, discarding the whole working tree, `--no-verify`, `npm publish`, `npm audit fix --force`,
  piping a download into a shell, and writing to `.env*`.
- `protect-files.mjs` — blocks edits to `package-lock.json`, `.env*` (except `.env.example`), `dist/`,
  `node_modules/` and `.git/`.
- `check-md-length.mjs` — PostToolUse: reports a Markdown file over 200 lines right after it is written. Run
  `node .claude/hooks/check-md-length.mjs --all` to check the whole project.

## Checking that it loads

Run `/memory` (rules and CLAUDE.md), `/skills`, `/agents` and `/hooks` in Claude Code. A rule with a `paths:` list
should appear only after Claude has read a matching file; if a path-scoped rule never shows up in your version, remove its
`paths:` block so it loads always.

## Extending

- A convention for a set of files → a rule with `paths:`. A convention for the whole project → `CLAUDE.md`, kept short.
- A repeatable procedure → a skill (`skills/<name>/SKILL.md`, under about 500 lines, a specific `description`).
- A distinct reviewer or specialist → an agent. Do not add agents for tasks the main session handles well.
- Something that must never happen → a hook or a `permissions.deny` entry, not a sentence in a rule.
- Keep project facts true: when a path, script or convention changes, update the rule that names it.
