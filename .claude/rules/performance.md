---
paths:
  - "src/**"
  - "vite.config.ts"
  - "index.html"
  - "public/**"
---

# Performance

Baseline measured on a production build (gzip, 1 KB = 1024 bytes; see `docs/guide/performance-ledger.md` for how each
number was reached): first-page JavaScript about 71.5 KB, CSS about 12.4 KB, the lazily loaded watch screen about
52.7 KB (fetched in the background once the browser is idle), a service-worker precache of about 966 KiB, reading mode
and the console transcript both holding a constant number of DOM nodes however long the video is. `npm run budget`
enforces the first-page and lazy-chunk sizes in CI. Treat all of these as a baseline to protect, not as numbers to
quote: re-measure before claiming a change is neutral.

- No new runtime dependency without a measured need. Run `npm run build && npm run budget` before and after.
- Code that is not needed for the first screen is split out: the whole watch screen (`WatchScreen.tsx`, loaded by
  `AppShell.tsx`), the `lazy()` panels inside it, the Framer Motion feature bundle in `App.tsx`. New large panels and
  libraries follow the same pattern. Anything the start screen imports ends up in every visitor's first download.
- Any list that can grow to hundreds of items is virtualised with `@tanstack/react-virtual`: reading mode and the
  console transcript (`TranscriptList`) both are. Do not render a full transcript, vocabulary or history list
  unbounded. A virtualised list must never record a 0 px measurement as a real size (see `TranscriptList.tsx`), or it
  renders every row. `src/__tests__/transcript-virtualization.test.tsx` guards the DOM size.
- Playback is a hot path. `usePlayerTime.ts` holds one shared clock (one 200 ms poll, `useSyncExternalStore`).
  Components that need something derived from the time (the active cue, a progress percentage) use
  `useClockSelector(getCurrentTime, select)`, which re-renders only when the selected value changes. `select` must
  return a stable value (a primitive or an existing object, never a new object or array). `usePlayerTime` (the raw time,
  re-render every tick) is only for components that display the time itself. `clock-rerenders.test.tsx` guards this.
- Timers that run only while a feature is on (`useLineLoop`, `useSceneRepeat`, `useShadowingMode`, `useLineClock`,
  `useCurrentSlice`) stay separate on purpose: moving them to the shared clock showed no measurable gain and risks
  their timing-critical behaviour. Do not add an always-on timer per component.
- Active-cue lookup is a binary search plus a short walk back over overlapping cues (`findActiveCue`, `O(log n + k)`),
  not a scan. A plain "cue that contains the time" binary search returns null in the middle of a long cue that
  overlaps a shorter one; the regression test covers it.
- Memoise only after measuring; a stable reference passed to a memoised child must actually be stable.
- Revoke every `URL.createObjectURL` when the video or file is replaced or unmounted.
- Fonts load by `unicode-range`; the UI chrome loads on every visit, so do not add families or weights casually.
  Subsetting the Arabic font was measured and rejected (see the ledger).
- Service worker: adding files to the precache raises the install size for every user. Check `dist` after a build.
