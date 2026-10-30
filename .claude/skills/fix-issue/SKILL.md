---
name: fix-issue
description: Fix a reported bug with this project's test-first workflow (reproduce, find the root cause, write a failing test, make the smallest fix, verify). Use when the user reports a bug, regression, wrong behaviour, visual glitch or failing test.
argument-hint: <bug description or steps to reproduce>
---

# Fix an Issue

Bug to fix: $ARGUMENTS

Companion skills: `debugging-and-error-recovery` (root-cause method), `test-driven-development` (red → green),
`verify` (final gates). Read the rules in `.claude/rules/` that match the files you touch.

## Workflow

1. **Reproduce first.** Trigger the bug in the codebase (a test, a script, or the dev server) before changing
   anything. If you cannot reproduce it, say so and ask for the missing detail; do not patch a guess.
2. **Locate the layer** with the table below, then trace to the root cause. A fix that hides the symptom is not a fix.
3. **Write the failing test** in the cheapest layer that can see the bug (see "Pick the test layer"). Name the file
   after the behaviour, e.g. `src/__tests__/sync-offset-persistence.test.tsx`.
4. **Run it and confirm it fails for the stated reason.** Keep the failing assertion message for the report. A test
   that was never seen failing proves nothing.
5. **Implement the smallest correct fix.** No unrelated refactoring, renames or formatting churn.
6. **Re-run the test** to confirm it passes, then run the `verify` skill for the full gates.
7. **Report** (format below).

## Where to look first

| Symptom | Start here |
|---|---|
| Wrong line shown, subtitles out of sync | `src/lib/subtitles/findActiveCue.ts` (overlapping cues), `src/hooks/usePlayerTime.ts` (`useClockSelector`), `src/hooks/useSyncOffsetPersistence.ts`, `src/lib/subtitles/` (offset is applied at read time; see the `subtitle-parsing` skill) |
| Subtitle file garbled or rejected | `src/lib/subtitles/parseSubtitleFile.ts` and the SRT/VTT/ASS parsers beside it (2 MB cap, bilingual split) |
| Video will not play (YouTube error 153, Vimeo, local file) | `Referrer-Policy` in `vercel.json`; `src/lib/youtube/extractVideoId.ts`; `useYouTubePlayer`, `useVimeoPlayer`, `useLocalVideoPlayer` |
| Settings, vocabulary or history lost, or missing from a backup | persistence helpers, `STORAGE_KEYS` in `src/constants/theme.constants.ts`, `src/lib/utils/backup.ts` |
| Word lookup wrong or stale | `src/lib/utils/wordLookup.ts`, `src/lib/utils/lookupCache.ts` (`CACHE_VERSION`), `src/lib/dictionary/` |
| Reading mode or the console transcript slow or jumpy | `src/components/reading/ReadingView.tsx` and `src/components/console/TranscriptList.tsx` (both virtualised), `useLineClock`, `usePlayerTime` |
| Wrapping, overlap, contrast, scroll, RTL placement | `src/index.css`, theme tokens, the component's classes; needs a real-browser check in `e2e/` |
| Keyboard or focus problem | `src/constants/keyboardShortcuts.ts`, `useKeyboardShortcuts`, `useDialogFocusTrap`, `useFocusRetention` |
| Offline, update prompt, install | `vite.config.ts` (vite-plugin-pwa), `src/components/system/Pwa*` |
| Build or CSP error | `src/lib/csp/buildCsp.ts`, `vite.config.ts`, host files; `src/lib/deploy/*.test.ts` |

## Pick the test layer

- Pure logic (parsing, timing, formatting, id extraction): unit test next to the source in `src/lib/**`.
- Behaviour across hooks and components (upload, sync, vocabulary, backup): `src/__tests__/*.test.tsx`
  with Testing Library; reset storage with `testHelpers/resetIndexedDb.ts`.
- Anything that exists only on screen (layout, contrast, scroll position, CSP): `e2e/` in real Chrome. A jsdom
  test cannot fail for these, so it would pass without the fix.

## Rules

- Never weaken, skip or delete an existing test to get green.
- If the root cause is a design flaw larger than the bug, fix the bug minimally and report the flaw separately.
- If the fix needs a new network host, a new dependency or a storage format change, stop and ask first.

## Report

1. **Root cause** — one or two sentences, with `file:line`.
2. **Fix** — what changed and why it is the smallest correct change.
3. **Test** — file name, the failing message before the fix, and that it passes after.
4. **Gates** — the `verify` table with real outcomes; say clearly what was not run (for example e2e without Chrome).
5. **Risks or follow-ups** — anything adjacent you noticed but did not change.
