---
name: new-feature
description: Build a new user-facing feature in this app following the project's architecture, persistence, accessibility, performance and test conventions. Use when the user asks to add, extend or redesign a feature, screen, setting, shortcut or UI component.
argument-hint: <feature description>
---

# Build a New Feature

Feature: $ARGUMENTS

Companion skills: `incremental-implementation` (thin slices), `test-driven-development`,
`frontend-ui-engineering` (UI quality and accessibility), `performance-optimization`,
`security-and-hardening`, `verify`, `review`. Read the rules in `.claude/rules/` that match the files you touch.

## 1. Scope

- Restate the goal as 3–7 acceptance criteria the user can check. Compare with *Key Features* and *Roadmap* in
  `README.md` so you extend what exists instead of duplicating it.
- Check the non-negotiables in `CLAUDE.md`: the app runs entirely client-side with no backend, secrets or new
  required external service. A feature that needs a new network destination changes the CSP and the privacy promise;
  stop and ask the maintainer before designing around it.
- Ask at most one question, and only when the answer changes the design. Otherwise state your assumption and go on.

## 2. Find the home for each piece

| Piece | Where |
|---|---|
| Pure logic (parse, format, compute) | `src/lib/<area>/` with a colocated `*.test.ts` |
| Stateful or effectful behaviour | one `useX` hook in `src/hooks/` (one concern per hook) |
| A video source | a new adapter hook behind `useVideoPlayer`; consumers stay untouched |
| UI | `src/components/<feature>/`; generic primitives only in `src/components/ui/` |
| Cross-cutting UI state | `src/context/`, only if it is truly cross-cutting |
| Types, constants | `src/types/*.types.ts`, `src/constants/` (no magic numbers) |

## 3. Persistence (only if the feature stores something)

- Go through a small helper, never an inline `localStorage.setItem`. Register the key in `STORAGE_KEYS`
  (`src/constants/theme.constants.ts`); backup and restore copy only registered keys.
- Derive per-video keys with `videoKey.ts`; guard reads against missing or corrupt data; clean up symmetrically.
- Add the key to the backup round-trip test. Details: `.claude/rules/state-persistence.md`.

## 4. Build in thin slices

1. Pure logic first, test-first (red → green).
2. Then the hook, then the component, then the wiring into the existing screen.
3. After every slice `npm run typecheck` and the affected tests are green. Do not stack unverified slices.

## 5. UI checklist

- [ ] Loading, empty and error states exist; both themes checked; theme tokens only (no raw hex).
- [ ] Right-to-left correct: logical utilities, `dir="ltr"` around number/slash runs, mixed Arabic/Latin rows.
- [ ] Works at phone width; touch targets comfortable; keyboard operable; focus managed; `Escape` closes dialogs.
- [ ] Text contrast ≥ 4.5:1 (`text-text-primary` / `text-text-secondary`, never the accent for text).
- [ ] `cn()` for classes, `m.*` for motion, `prefers-reduced-motion` respected, `ui/` primitives reused.
- [ ] A large or rare panel is loaded with `lazy()`; a long list is virtualised.
- [ ] User-facing strings are easy to find (an interface translation is on the roadmap).

## 6. Cost and safety

- Adding a dependency or a large panel: compare the gzip size of the files `dist/index.html` loads before and
  after `npm run build`, and say the numbers.
- Untrusted input (files, URLs, dictionary or network responses) is rendered as text only; no `dangerouslySetInnerHTML`.

## 7. Tests

Unit tests for logic, an integration test for the user-visible flow, an `e2e/` check for anything only a real
browser can see. One file per behaviour, named after what it verifies.

## 8. Documentation

Update `README.md` (main features, future additions) and the matching file in `docs/guide/` or `docs/architecture/` when behaviour or structure
changes. Change `CLAUDE.md` or `.claude/rules/` only when a convention itself changes. Never document what was not built.

## 9. Finish

Run the `verify` skill, then `review` for anything larger than a few lines. Report: what was built, decisions and
trade-offs, files touched, tests added, real gate results, and known limitations or next steps.
