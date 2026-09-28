# Testing

- Stack: Vitest + React Testing Library, `fake-indexeddb` for storage-dependent tests.
- One test file per behavior or bug, named after what it verifies
  (e.g. `sync-offset-persistence.test.tsx`, `focus-retention-iframe.test.tsx`) —
  not per component.
- TDD discipline for bug fixes is mandatory: write the failing test first, confirm
  it fails for the right reason, then implement the fix, then confirm it passes.
  Do not restore/write a "regression test" without having seen it fail first.
- Test user-visible behavior (what's rendered, what fires) over implementation
  details. Query by role/label text, not test-only selectors, unless unavoidable.
- Clean up any IndexedDB/localStorage state a test creates (see
  `resetIndexedDb.ts` test helper) so tests stay order-independent.
- Before calling any fix or feature done, run: `npm test`, `npm run lint`,
  `npm run build` (which runs `tsc -b`). All three must pass.
