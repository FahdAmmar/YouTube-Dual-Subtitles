# YouTube Dual Subtitles — Project Guide for Claude

## What this is
Frontend-only React + TypeScript app that plays YouTube/Vimeo/local videos with two
synchronized subtitle tracks (dual-language). No backend, no database, no API keys —
everything (including subtitle files) stays in the browser (`localStorage` + `IndexedDB`).

## Stack
- React 18 + TypeScript (strict, `noUncheckedIndexedAccess`)
- Vite 7 + `vite-plugin-pwa` (deploy settings: `BASE_PATH`, `SITE_URL` — see docs/ARCHITECTURE.md → Deployment)
- `@tanstack/react-virtual` (reading-mode list: only cards near the screen are in the DOM)
- Tailwind CSS + Framer Motion (through `LazyMotion` in `App.tsx`: use `m.div`, never `motion.div`; `strict` throws on the full component)
- Vitest + React Testing Library
- ESLint 8 (deprecated upstream; a move to ESLint 9 flat config is pending)
- Real-browser checks: `puppeteer-core` + `axe-core` (`npm run e2e`)

## Commands
| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Type-check | `npm run typecheck` (same as `npx tsc --noEmit`, plus the Vite config) |
| Build | `npm run build` (runs the type-check first) |
| Tests | `npm test` |
| Lint | `npm run lint` |
| Real-browser a11y/CSP/layout check | `npm run build && npm run e2e` (needs Chrome: `CHROME_PATH`) |

## Architecture map
- `src/hooks/` — one hook per concern (`useYouTubePlayer`, `useVimeoPlayer`,
  `useLocalVideoPlayer`) unified behind `useVideoPlayer` (Player Adapter pattern).
  Adding a new video source means adding a new adapter hook, not touching consumers.
- `src/lib/{youtube,vimeo,subtitles,utils,dictionary}/` — pure, framework-free logic. Prefer
  putting new parsing/format logic here so it's independently testable.
- `src/components/` — organized by feature area (`video`, `subtitles`, `settings`,
  `console`, `reading`, `layout`, `system`, `ui`). `ui/` is generic/reusable only.
- `src/lib/{csp,deploy}/` — build-time helpers used by `vite.config.ts` (Content-Security-Policy,
  base path, share-image URLs). Host files (`public/_headers`, `vercel.json`, `netlify.toml`)
  must stay consistent: `src/lib/deploy/hostConfigs.test.ts` enforces it.
- Subtitles on the video: `SubtitleOverlay` renders one `SubtitleLine` per language (each drags on its own via
  `useDraggableOverlayPosition`); placement + offsets persist through `useSubtitleLayout` (one `localStorage` key,
  normalized on read). Words of the translation line open `VideoWordCard`, which reuses the sidebar's `WordDefinitionCard`.
- Word lookup: `lookupWord` (`lib/utils/wordLookup.ts`) merges MyMemory (translation), Wiktionary REST (meanings) and
  `lib/dictionary/` (German article/plural/verb forms/lemma from the Wikimedia Action API on `en.wiktionary.org`, the host the CSP already allows).
  Bump `CACHE_VERSION` in `lookupCache.ts` whenever `WordLookupResult` gains data older cached entries lack.
- `src/context/` — cross-cutting UI state only (theme, subtitle settings). Don't reach
  for context for state that's local to one feature.
- `src/__tests__/` — one file per behavior/bug, named after what it verifies.

## Non-negotiables (see `.claude/rules/`)
- No backend calls, no secrets, no new required external services — this app's value
  proposition is "runs entirely client-side."
- New persistent state goes through the existing `localStorage`/`IndexedDB` helpers
  (see `.claude/rules/state-persistence.md`), not ad-hoc reads/writes.
- Every bug fix ships with a regression test that is confirmed to fail without the fix.
- jsdom has no layout, scrolling or colour: a bug that only shows on screen (wrapping, overlap, contrast,
  scroll position) needs a check in `e2e/` (real Chrome), not only a unit test.
- Never set `Referrer-Policy: no-referrer`: YouTube embeds then refuse to play (error 153).
- Text must reach WCAG AA (4.5:1). The accent colour is derived from the subtitle colour, so never rely on
  `text-console` or `text-text-muted` for text; use `text-text-primary` / `text-text-secondary`.
- Numbers around " / " inside RTL text swap places: wrap them in `dir="ltr"`.

## Where to look next
- `.claude/rules/` — code style, testing conventions, persistence conventions
- `.claude/commands/` — `/review`, `/fix-issue` workflows
- `.claude/agents/` — `code-reviewer`, `security-auditor` sub-agents
- `.claude/skills/subtitle-parsing/` — SRT/VTT parsing & bilingual-split reference
