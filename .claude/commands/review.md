---
description: Review the current diff against this project's conventions
---

Review the pending changes (`git diff`) against `CLAUDE.md` and `.claude/rules/`:

1. Run `npm run lint`, `npm run build`, `npm test` — report any failures verbatim.
2. Check architecture fit: does new logic belong in `src/lib/` vs a hook vs a
   component, per `.claude/rules/code-style.md`?
3. Check persistence: any new `localStorage`/`IndexedDB` access goes through
   existing helpers, per `.claude/rules/state-persistence.md`.
4. Check tests: new behavior has a test; bug fixes have a test that was confirmed
   to fail first, per `.claude/rules/testing.md`.
5. Flag: unused deps added, dead code, duplicated logic that should reuse an
   existing hook/util, missing loading/empty/error states in new UI.
6. Summarize findings as a short checklist (✅ / ⚠️ / ❌) — do not restate the
   whole diff back.
