# Testing

- Stack: Vitest + React Testing Library + jsdom, `fake-indexeddb` for storage-dependent tests.
  Setup lives in `src/__tests__/setup.ts`; stand-ins for build-time modules live in
  `src/__tests__/stubs/` (for example `virtual:pwa-register/react`).
- Three layers — pick the cheapest one that can actually see the bug:
  1. **Unit**: colocated with the source in `src/lib/**` (`*.test.ts`) for parsers, timing, formats, helpers.
  2. **Integration**: `src/__tests__/*.test.tsx` for whole flows (upload, sync, reading mode, vocabulary, backup).
  3. **Real browser**: `e2e/*.a11y.mjs` (puppeteer-core + axe-core) for anything jsdom cannot see —
     layout, wrapping, overlap, scroll position, colour contrast, CSP. jsdom has no layout engine.
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
- Never weaken a test to get green: no skipped tests, no deleted assertions, no larger
  timeouts. `testTimeout` is already 15 s in `vitest.config.ts`; a test that needs more is hiding a hang.
- Guard tests that protect cross-file contracts — keep them passing, extend them when you add to the contract:
  `theme-contrast.test.ts` (text tokens ≥ 4.5:1), `css-vendor-prefixes.test.ts`,
  `src/lib/deploy/hostConfigs.test.ts` (CSP/host files agree), `src/lib/deploy/fontFiles.test.ts`.
- Run one file while iterating: `npx vitest run src/__tests__/<name>.test.tsx`.
- Before calling any fix or feature done, run: `npm test`, `npm run lint`,
  `npm run typecheck`, `npm run build` (all four must pass), plus `npm run build && npm run e2e`
  when the change affects layout, colour, focus, CSP or reading mode. The `verify` skill runs this
  sequence and reports real results.
