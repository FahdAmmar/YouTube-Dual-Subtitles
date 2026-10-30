# Performance ledger

Every performance change that was tried, what was measured before and after, and whether it stayed. Rejected and
neutral attempts are listed on purpose, so nobody measures them again. Rule: measure first, change one thing, measure
again, and revert what does not move a number.

**How numbers were taken.** Bundle sizes: gzip level 9 of the files in `dist/` (`gzip -9` for the before/after
comparison; `npm run budget` uses Node's zlib, which reports slightly different bytes). DOM counts and render counts:
Vitest with jsdom, which has no layout engine, so absolute times from it are only a relative signal; counts are exact.
Not measured: real-browser Core Web Vitals and the e2e suite (no Chrome was available when these changes were made).

## Kept

| Change | Metric | Before | After |
|---|---|---|---|
| Watch screen loaded on demand (`WatchScreen.tsx`), prefetched when the browser is idle | First-page JavaScript (`index` + `vendor`), gzip | 118,294 B | 72,759 B (-38.5%) |
| same | Main chunk, raw | 230,932 B | 82,505 B (-64%) |
| Console transcript virtualised (`TranscriptList`) | DOM nodes at 3,000 slices | 81,003 | 508, constant from 300 to 6,000 slices |
| same | Mount at 3,000 slices (jsdom, 1 core) | 4,837 ms | 98 ms |
| same | Average update per tick at 300 / 1,500 / 3,000 slices (jsdom) | 5.3 / 9.7 / 13.7 ms, growing with length | 4.4 / 4.8 / 4.8 ms, flat |
| Clock selectors (`useClockSelector`) in `SubtitleOverlay`, `MobileActiveCaption`, `TranscriptList` | Re-renders over 5 ticks inside one cue | 5 (overlay), card walks 10 (list) | 0 and 0 |
| `findActiveCue` handles overlapping cues | Correctness | `null` in the middle of a long cue that contains a shorter one | the long cue stays visible |
| `useRef(Math.random...)` replaced by lazy `useState` in the YouTube and Vimeo hooks | Work per render | a random id built and dropped on every render | built once |

**What the lazy watch screen costs.** A session that goes on to watch downloads slightly more in total: 137,372 B before,
148,909 B after (+11.5 KB gzip, +8.4%), because the virtualiser now sits in the watch path and the split adds a shared
chunk. It arrives after the first paint and, once the browser is idle, before the user has typed a link. Reading mode
got smaller (17,465 B to 10,079 B) because the virtualiser moved out of it. A session that also opens reading mode ends
about 4 KB higher in total. The trade is deliberate: the first page is what every visit pays for.

**What the clock selectors do not do.** They remove renders that showed the same thing. The control bar and the reading
dock still re-render five times a second, because they display the time. The progress bar of the active transcript card
still updates every tick, but only that small component does.

## Tried and not done

| Idea | Finding | Decision |
|---|---|---|
| Move `useLineLoop`, `useSceneRepeat`, `useShadowingMode`, `useCurrentSlice` onto the shared clock | They run only while their feature is on (or reading mode is open), so there is nothing to save in normal use; the loop jumps back at an 80 ms resolution that a 200 ms shared poll cannot give | Not done. Revisit only with a measured problem |
| Subset the Arabic font (Regular, 71,904 B) | Keep all Arabic and Latin: 59,784 B (-17%) but it drops `−`, arrows and `✓` that the shortcuts UI uses, so they would come from another font. Also drop Arabic Presentation Forms: 55,668 B (-23%), but legacy text would fall back to a system font. Also drop Latin-1: 47,408 B (-34%), but German umlauts would trigger a second font request | Rejected: gain of at most ~12 KB per weight against visible fallbacks, with no browser here to check them |
| Replace `tailwind-merge` (28.5 KB raw in the first-page chunk) | `cn()` resolves conflicting Tailwind classes; a plain `clsx` would change styling where an override is relied on | Not done. A candidate for its own measured change, with a visual check |
| More code splitting, `React.memo`/`useMemo` sweeps, image work | First-page JS is already far under the 200 KB guideline; hot components are already memoised; there are no images above the fold | No evidence they would move a number |
| `eslint-plugin-jsx-a11y` | Latest release (6.10.2) supports ESLint up to 9; this project uses 10 and `npm install` fails with ERESOLVE | Not installed. Not forced with `--legacy-peer-deps` |
| Fix all 49 findings of the strict react-hooks rules | 36 are the "latest ref" pattern, fine on React 18; many sit in the timing-sensitive player hooks | Ratchet instead (`npm run lint:strict`): the count may only go down |

## Guards that keep these numbers

- `npm run budget`: first-page JS and CSS and every lazy chunk against a gzip budget (CI).
- `src/__tests__/transcript-virtualization.test.tsx`: the DOM size of the transcript list.
- `src/__tests__/clock-rerenders.test.tsx`: no re-render per tick for what shows the active cue.
- `src/lib/subtitles/findActiveCue.test.ts`: overlapping cues, and agreement with a linear scan on random data.
- `npm run lint:strict`: the strict react-hooks findings cannot grow.
