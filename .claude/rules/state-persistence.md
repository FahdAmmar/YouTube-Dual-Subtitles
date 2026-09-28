# Client-Side Persistence Conventions

This project has no backend/API, so the usual "API conventions" rule is replaced by
this one — the equivalent surface here is `localStorage` + `IndexedDB` access.

- `localStorage` holds small metadata (settings, sync offsets, watch-history
  entries). `IndexedDB` holds larger content (subtitle file text).
- Never read/write these directly from a component — go through the existing
  hooks/helpers (e.g. `useLocalStorage`, `useSyncOffsetPersistence`,
  `useWatchHistory`). New persisted state gets a new small helper, not an inline
  `localStorage.setItem`.
- Keying: persistence keys are derived from (video, track, file) via the shared
  `videoKey.ts` helper — never hand-roll a key format.
- Cleanup is symmetric: anything that deletes a watch-history entry must also clean
  up its associated sync offsets and `IndexedDB` subtitle content — no orphaned data.
- Guard every storage read for absence/corruption (quota errors, private-browsing
  restrictions, older data shapes) and fail soft with a clear UI fallback — never
  let a storage read crash the app.
- Treat parsed subtitle file content as untrusted input (see
  `.claude/agents/security-auditor.md`).
