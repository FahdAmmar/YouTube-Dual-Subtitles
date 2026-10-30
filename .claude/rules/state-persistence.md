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

## Registering a new `localStorage` key

- Add the key to `STORAGE_KEYS` in `src/constants/theme.constants.ts` (prefix `ydc:`).
  Never write a bare string key in a hook or component.
- Backup and restore (`src/lib/utils/backup.ts`) copies **only** keys listed in
  `STORAGE_KEYS`; anything else is dropped on purpose (including `__proto__`). A key that is not
  registered is therefore silently missing from the user's backup — register it, and extend
  `backup.test.ts` so the new key survives a round trip.
- If the stored shape changes, normalise on read so older data still loads. Change
  `BACKUP_VERSION` only for a break in the backup file format itself, and keep `parseBackup`
  reading the older version.
- The word-lookup cache is versioned separately: bump `CACHE_VERSION` in
  `src/lib/utils/lookupCache.ts` whenever `WordLookupResult` gains data that older cached
  entries lack.
- Tests that touch storage reset it (`src/__tests__/testHelpers/resetIndexedDb.ts` for IndexedDB)
  so they stay order-independent.
