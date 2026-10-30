# DUAL_SUB — Testing, quality and performance

[← Back to the README](../../README.md)

## Testing and Quality

Three complementary layers:

| Layer | Tooling | What it covers |
|---|---|---|
| **Unit** | Vitest | Parsers, pairing, timing, scheduling, export formats, helpers (colocated with sources in `src/lib/`) |
| **Integration** | Vitest + Testing Library + jsdom | Whole-app flows: upload, sync, reading mode, vocabulary, backup (`src/__tests__/`) |
| **Real browser** | puppeteer-core + axe-core | What jsdom cannot see: layout, scrolling, contrast, CSP (`e2e/`) — run against the production build |

The e2e check runs four scenarios (dark/light × desktop/mobile) in real Chrome via `npm run build && npm run e2e`. jsdom has no layout engine, so any bug that only shows on screen (wrapping, overlap, contrast, scroll position) is covered here, not only in unit tests.

`npm run e2e:screens` adds axe checks of the home, settings, vocabulary and review screens (not part of CI yet).

Every push and pull request runs the full quality gate (type-check, lint, tests, build, e2e) in GitHub Actions.

### If `npm test` reports "Failed to start forks worker"

Each test file runs in its own forked process, and Vitest gives a fork a fixed 60 s to start. A fork that misses it is dropped from the run, so the file count and test total come out smaller than the real suite (130 files, 871 tests at the time of writing) while the other files still pass. The same overload makes timing-sensitive tests time out although each passes alone.

`vitest.config.ts` therefore uses half the logical CPUs, at least two and at most four workers. On a slower or heavily loaded machine (antivirus scanning `node_modules`, little free memory) lower it further:

| Shell | Command |
|---|---|
| bash / zsh | `VITEST_MAX_WORKERS=2 npm test` |
| PowerShell | `$env:VITEST_MAX_WORKERS=2; npm test` |
| cmd.exe | `set VITEST_MAX_WORKERS=2 && npm test` |

A run is only complete when the summary shows every test file and no "Errors" line.

---


## Performance

Measured on a production build served in headless Chrome (cold cache, first visit):

| Metric | Value |
|---|---|
| First-visit transfer | ~403 KB (15 requests) |
| JavaScript for the first page | ~71 KiB gzip, down from ~115 KiB: the watch screen (~53 KiB) is fetched in the background when the browser is idle (+ a lazily loaded motion chunk) |
| Fonts on first visit | Latin/Arabic parts only; other subsets load on demand via `unicode-range` |
| Service worker install size | ~966 KiB (Workbox precache, 34 files) |
| Reading mode at 3,000 lines | ~150 ms, ~870 DOM nodes (down from ~4 s / ~108,000 nodes before virtualization) |
| Console transcript at 3,000 lines | 508 DOM nodes, constant with the length (was 81,003; measured in jsdom) |

The first-page JavaScript, the service-worker size and the DOM counts were re-measured on the current build (gzip of the files `index.html` loads; the Workbox precache total; Vitest with jsdom). The first-visit transfer and the reading-mode timings are from the previous release and were not re-measured. `npm run build && npm run budget` keeps the bundle sizes inside their budgets, and `docs/guide/performance-ledger.md` records what was tried, what was measured and what was rejected.

See `docs/ARCHITECTURE.md` for the methodology, internals, and engineering lessons behind these numbers.
