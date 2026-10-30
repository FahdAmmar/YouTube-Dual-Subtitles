---
name: verify
description: Run the project's quality gates (type-check, lint, tests, production build, real-browser e2e) and report real results. Use before claiming work is done, fixed or passing, before a commit or hand-off, and after changing dependencies, CSS, the CSP or deployment files.
argument-hint: [quick | full]
---

# Verify

Mode: $ARGUMENTS (default: `full`)

Companion skill: `verification-before-completion`. The rule is evidence before claims: a gate counts as passed
only if it ran in this session, after the last code change, and you read its output. A script that does not exist,
a check you did not run, or a timeout is **not** a pass.

## Gates

| # | Gate | Command | Catches |
|---|---|---|---|
| 0 | Markdown size | `node .claude/hooks/check-md-length.mjs --all` | any `.md` file over 200 lines |
| 1 | Type-check | `npm run typecheck` | app and Vite-config type errors (strict, `noUncheckedIndexedAccess`) |
| 2 | Lint | `npm run lint` and `npm run lint:strict` | ESLint 10 flat config, `--max-warnings 0` (a warning fails); the strict react-hooks ratchet may not grow |
| 3 | Tests | `npm test` | Vitest: unit, integration, contract guards (contrast, CSS prefixes, host configs, fonts) |
| 4 | Build | `npm run build && npm run budget` | type-checks again, then Vite production build and PWA precache; first-page JS/CSS and lazy chunks inside their gzip budgets |
| 5 | Real browser | `npm run build && npm run e2e` | axe (WCAG AA), contrast, layout, CSP in real Chrome |
| 6 | Real browser, screens | `npm run e2e:screens` | axe on home, settings, vocabulary and review; subtitle size on a phone |

- **quick**: gates 1–2 plus only the tests that cover the changed files (`npx vitest run <paths>`). Use while iterating.
- **full**: gates 0–5, and 6 when UI, colours or screens changed. Always finish a task with `full`.
- CI (`.github/workflows/ci.yml`) runs gates 1–5 in this order, but not 0 or 6; keep local and CI results comparable.
- **Before delivering a ZIP**, run `full` (all of `npm test`, not a subset) plus gate 6, and deliver only if every
  gate passed. If one cannot run (for example no Chrome), tell the user before delivering and do not call the
  project ready to upload.

## Practical notes

- The suite can take several minutes on a machine with one or two cores (Vitest uses half the logical CPUs, at least two and at most four;
  `VITEST_MAX_WORKERS=<n>` overrides it). Allow enough time, or run it detached and poll the log; never report a timeout as a result.
- Gates 5 and 6 need a Chrome binary and a fresh `dist/`. They read `CHROME_PATH` (default `/usr/bin/google-chrome`),
  `CHROME_ARGS` (default `--no-sandbox --disable-gpu`), `E2E_HEADLESS` and `E2E_PORT` (default 4173 for `e2e`, 4174 for `e2e:screens`). Without Chrome,
  mark them **not run** and say why.
- `npm run e2e:screens` is currently clean in all four scenarios (dark/light × desktop/mobile). Any violation is a
  regression from your change and is yours to fix.

## Extra checks by change type

| Changed | Also do |
|---|---|
| `package.json` or the lockfile | `npm ci` from clean, then all gates; `npm audit --omit=dev` and **report** findings (never `npm audit fix --force`); confirm versions on the npm registry |
| CSS, theme tokens, fonts | gates 3 and 5–6 (contrast, prefix-order and font-file guards run inside `npm test`) |
| `src/lib/csp`, `vite.config.ts`, host files | the `src/lib/csp` and `src/lib/deploy` tests (inside `npm test`) and gate 5 |
| A dependency or a large panel | run `npm run budget` and compare the gzip size of the files `dist/index.html` loads with the baseline in `docs/guide/performance-ledger.md` (about 71 KiB for the first page) and report both numbers |
| Persisted state | the backup round-trip test and a corrupted-storage case |

## When a gate fails

1. Capture the actual output; do not paraphrase it.
2. Classify it: introduced by this change, pre-existing, environment, or missing dependency.
3. Fix what this change introduced; re-run that gate, then the broader set.
4. Never skip a test, delete an assertion, raise a timeout, loosen `tsconfig` or silence a lint rule to get green,
   and never edit package scripts to manufacture a pass.
5. Report anything unresolved precisely.

## Final report

| Gate | Command | Result | Notes |
|---|---|---|---|
| Type-check | `npm run typecheck` | pass / fail / not run | |

One row per gate with the real outcome and, for tests, the real counts (files and tests). Below the table list
failures with their output, skipped checks with the reason, and remaining risks. Do not call work production-ready or
fully verified while any required gate is failing or was not run.
