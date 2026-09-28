---
description: Fix a reported bug using this project's TDD-first workflow
argument-hint: <description of the bug or steps to reproduce>
---

Bug to fix: $ARGUMENTS

Follow this project's non-negotiable workflow:

1. Reproduce the bug directly in the codebase first — don't guess from the report.
2. Identify the root cause (trace it, don't patch a symptom).
3. Write a failing test in `src/__tests__/` named after the bug, and run it to
   confirm it actually fails, and fails for the stated reason.
4. Implement the smallest correct fix.
5. Re-run the test to confirm it now passes.
6. Run the full suite (`npm test`), lint, and build to check for regressions.
7. Report: root cause, the fix, and confirmation that the test failed-then-passed.
