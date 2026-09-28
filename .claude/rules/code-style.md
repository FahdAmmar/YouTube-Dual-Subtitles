# Code Style

- TypeScript strict mode is on (`noUncheckedIndexedAccess`) — never silence a type
  error with `as`/`!` when a narrowing check is possible instead.
- One hook = one concern. If a hook grows past ~150 lines or mixes two unrelated
  responsibilities, extract (see `useDialogFocusTrap`, `useSubtitleUploadHandlers`
  as precedents).
- Pure logic (parsing, formatting, id extraction) belongs in `src/lib/`, not inside
  components or hooks — keeps it unit-testable without rendering anything.
- Naming: hooks `useX`, pure helpers `verbNoun` (e.g. `extractVimeoVideoId`), types
  colocated per domain in `src/types/*.types.ts`.
- No magic numbers for durations/limits — name them as constants near their use
  (see `src/constants/`).
- Comments explain *why*, not *what*; keep them short and in English.
- Avoid new dependencies unless they solve a real, non-trivial problem — this app's
  bundle size and "no backend needed" simplicity are deliberate.
