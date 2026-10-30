---
name: debugging-and-error-recovery
description: Guides systematic root-cause debugging. Use when tests fail, builds break, something that worked yesterday broke, behavior doesn't match expectations, or you encounter any unexpected error. Use when you need to figure out what broke and why — a systematic approach to finding and fixing the root cause rather than guessing.
---

# Debugging and Error Recovery

## Overview

Systematic debugging with structured triage. When something breaks, stop adding features, preserve evidence, and follow a structured process to find and fix the root cause. Guessing wastes time. The triage checklist works for test failures, build errors, runtime bugs, and production incidents.

## When to Use

- Tests fail after a code change
- The build breaks
- Runtime behavior doesn't match expectations
- A bug report arrives
- An error appears in logs or console
- Something worked before and stopped working

## The Stop-the-Line Rule

When anything unexpected happens:

```
1. STOP adding features or making changes
2. PRESERVE evidence (error output, logs, repro steps)
3. DIAGNOSE using the triage checklist
4. FIX the root cause
5. GUARD against recurrence
6. RESUME only after verification passes
```

**Don't push past a failing test or broken build to work on the next feature.** Errors compound. A bug in Step 3 that goes unfixed makes Steps 4-6 wrong.


## Continued in other files

This file is split to keep every Markdown file under 200 lines. Load the part that matches your current step:

- [references/the-triage-checklist.md](references/the-triage-checklist.md) — The Triage Checklist; Error-Specific Patterns
- [references/safe-fallback-patterns.md](references/safe-fallback-patterns.md) — Safe Fallback Patterns; Instrumentation Guidelines; Common Rationalizations; Treating Error Output as Untrusted Data; Red Flags; Verification
