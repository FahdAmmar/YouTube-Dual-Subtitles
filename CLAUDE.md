# YouTube Dual Subtitles — Project Guide for Claude

## What this is
Frontend-only React + TypeScript app that plays YouTube/Vimeo/local videos with two
synchronized subtitle tracks (dual-language). No backend, no database, no API keys —
everything (including subtitle files) stays in the browser (`localStorage` + `IndexedDB`).

## Stack
- React 18 + TypeScript (strict, `noUncheckedIndexedAccess`)
- Vite + `vite-plugin-pwa`
- Tailwind CSS + Framer Motion
- Vitest + React Testing Library
- ESLint

## Commands
| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Build | `npm run build` (runs `tsc -b` first) |
| Tests | `npm test` |
| Lint | `npm run lint` |

## Architecture map
- `src/hooks/` — one hook per concern (`useYouTubePlayer`, `useVimeoPlayer`,
  `useLocalVideoPlayer`) unified behind `useVideoPlayer` (Player Adapter pattern).
  Adding a new video source means adding a new adapter hook, not touching consumers.
- `src/lib/{youtube,vimeo,subtitles,utils}/` — pure, framework-free logic. Prefer
  putting new parsing/format logic here so it's independently testable.
- `src/components/` — organized by feature area (`video`, `subtitles`, `settings`,
  `console`, `layout`, `system`, `ui`). `ui/` is generic/reusable only.
- `src/context/` — cross-cutting UI state only (theme, subtitle settings). Don't reach
  for context for state that's local to one feature.
- `src/__tests__/` — one file per behavior/bug, named after what it verifies.

## Non-negotiables (see `.claude/rules/`)
- No backend calls, no secrets, no new required external services — this app's value
  proposition is "runs entirely client-side."
- New persistent state goes through the existing `localStorage`/`IndexedDB` helpers
  (see `.claude/rules/state-persistence.md`), not ad-hoc reads/writes.
- Every bug fix ships with a regression test that is confirmed to fail without the fix.

## Where to look next
- `.claude/rules/` — code style, testing conventions, persistence conventions
- `.claude/commands/` — `/review`, `/fix-issue` workflows
- `.claude/agents/` — `code-reviewer`, `security-auditor` sub-agents
- `.claude/skills/subtitle-parsing/` — SRT/VTT parsing & bilingual-split reference
