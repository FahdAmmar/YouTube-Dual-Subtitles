---
name: review
description: Review pending changes against this project's conventions and quality gates, combining the five-axis code review with the project's specialist agents. Use before committing or merging, or when asked to review a diff, branch, file or pull request.
argument-hint: [optional scope: file, folder, "staged", or a branch]
---

# Review Changes

Scope: $ARGUMENTS (default: all pending changes)

Companion skills: `code-review-and-quality` (the five-axis method and severity labels), `verify` (gates).
Agents: `code-reviewer`, `accessibility-reviewer`, `security-auditor`. Reviewing is read-only: report findings,
do not edit code unless the user asks.

## Workflow

1. **Collect the change without running git.** This project does not allow git commands unless the user asks for
   them. Ask which files changed (or use the paths in the request) and read each file together with the code
   around the change. Only if the user explicitly asks, use `git diff` / `git diff --staged` (the hook needs
   `CLAUDE_ALLOW_GIT=1`). Note the files touched so you can match them to rules.
2. **Run the gates.** Use the `verify` skill (quick mode is enough for a small diff). Report failures verbatim
   and say whether each was introduced by this change or pre-existing.
3. **Review on five axes** — correctness, readability, architecture, security, performance — plus the project checks:
   - Architecture: logic in `src/lib/`, one concern per hook, components in their feature folder (`rules/code-style.md`).
   - Persistence: helpers only; new keys registered in `STORAGE_KEYS`; symmetric cleanup (`rules/state-persistence.md`).
   - UI: `cn()`, theme tokens, `m.*`, logical RTL utilities, loading/empty/error states (`rules/frontend-ui.md`).
   - Tests: new behaviour covered; each bug fix has a test that failed first; no weakened or skipped tests (`rules/testing.md`).
   - Contract files: CSP, host files and `hostConfigs.test.ts` change together (`rules/tooling-and-ci.md`).
   - Cost: unneeded dependencies, dead code, duplicated logic, unbounded lists or timers (`rules/performance.md`).
4. **Delegate by what changed**, in parallel when the reviews are independent:
   - always `code-reviewer`;
   - components, CSS, colours, dialogs, shortcuts → `accessibility-reviewer`;
   - parsing, URL/id handling, storage, backup, dictionary or network code, CSP, dependencies → `security-auditor`.
   Merge the results and remove duplicates.
5. **Report.**

## Report format

- One verdict: **Approve**, **Approve with suggestions**, or **Request changes**.
- A short ✅ / ⚠️ / ❌ checklist, one line per finding, each with `file:line` and a severity:
  **Critical** (blocks merge), **Important** (should fix), **Suggestion** (optional).
- Include what the gates actually reported, and what was not run.
- Do not restate the diff, and do not flag style that ESLint already enforces.

Approve when the change clearly improves the code base even if it is not how you would have written it; block only
for correctness, security, accessibility regressions, missing tests for changed behaviour, or broken gates.
