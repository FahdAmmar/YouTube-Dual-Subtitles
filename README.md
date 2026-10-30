# DUAL_SUB — Dual-Subtitles Video Player

> **YouTube • Vimeo • Local video** — two synchronized subtitle tracks on one timeline. Read along, look up words,
> and review what you learn. Everything runs in your browser: no backend, no account, no API keys.

## Built with

<p align="center">
  <img src="https://skillicons.dev/icons?i=react,ts,vite,tailwind,vitest,eslint,nodejs,npm,github,githubactions,vercel,puppeteer&perline=14" alt="Tech stack icons" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 7" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4.3" />
  <img src="https://img.shields.io/badge/Framer_Motion-11-0055FF?style=flat-square&logo=framer&logoColor=white" alt="Framer Motion 11" />
  <img src="https://img.shields.io/badge/TanStack_Virtual-3-FF4154?style=flat-square" alt="TanStack Virtual 3" />
  <img src="https://img.shields.io/badge/Lucide_React-0.454-F56565?style=flat-square" alt="Lucide React" />
  <img src="https://img.shields.io/badge/PWA-installable-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vitest-4.1-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest 4.1" />
  <img src="https://img.shields.io/badge/Testing_Library-16-E33332?style=flat-square&logo=testinglibrary&logoColor=white" alt="Testing Library 16" />
  <img src="https://img.shields.io/badge/ESLint-10-4B32C3?style=flat-square&logo=eslint&logoColor=white" alt="ESLint 10" />
  <img src="https://img.shields.io/badge/axe--core-4.14-1F6FEB?style=flat-square" alt="axe-core 4.14" />
  <img src="https://img.shields.io/badge/Puppeteer-25-40B5A4?style=flat-square&logo=puppeteer&logoColor=white" alt="Puppeteer 25" />
  <img src="https://img.shields.io/badge/Node.js-22-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 22" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License: MIT" />
</p>

## Screenshots

| Start screen | Player with dual subtitles | Reading mode | Mobile player |
|---|---|---|---|
| ![Start screen with watch history](docs/images/12-home-with-watch-history.webp) | ![Player with dual subtitles](docs/images/13-player-dual-subtitles.webp) | ![Reading mode on desktop](docs/images/14-reading-mode-desktop.webp) | ![Player on a phone](docs/images/15-player-mobile.webp) |

*Screenshots show public German-learning videos from YouTube; video content belongs to its creators.*

## About the project

**DUAL_SUB** (`youtube-dual-subtitles`) is a client-side React application that plays YouTube, Vimeo or local
video files with **two synchronized subtitle tracks** — for example the original language and its translation —
and turns every word into a clickable dictionary entry you can save and review later.

Language learning from video is usually limited to one subtitle track, or none. You cannot see the original text and
its translation together, look a word up without leaving the player, or review what you learned afterwards. DUAL_SUB
addresses all three.

It is **local-first**: no backend, no database, no analytics, no login, no API keys. Settings, watch history,
subtitle files and vocabulary live in `localStorage` and `IndexedDB`, inside your browser, and can be exported as
one JSON backup.

> [!NOTE]
> The interface is currently **Arabic and right-to-left (RTL)**; translating it is planned (see
> [Future additions](#future-additions)).

### Main features

- **Dual subtitles** on the video: each line has its own colour, size and position, and drags independently.
- **Three video sources**: YouTube, Vimeo, or a local file that never leaves your device.
- **Subtitle formats**: `.srt`, `.vtt`, `.ass`/`.ssa`, and bilingual single files split into two tracks (2 MB cap).
- **Syncing**: nudge each track, or use two-point sync to fix drifting subtitles; offsets are remembered per video.
- **Reading mode**: a lyrics-style list that follows the audio and highlights the word being spoken.
- **Vocabulary and review**: click a word for its meaning, save it with its sentence, then review it with
  spaced repetition; export to CSV or Anki Cloze. German adds article, plural, verb forms and lemma.
- **Study tools**: recall mode, shadowing mode, line repeat, bookmarks, text-to-speech, playback speed up to 2×.
- **Installable PWA** that works offline once loaded, with light and dark themes checked for WCAG AA contrast.
- **Touch-friendly interface**: icon buttons keep ~44 px tap areas on touch screens, rarely used actions sit in a
  "more options" menu, clearing the watch history asks for confirmation, and the interface accent can optionally follow
  the subtitle colour (off by default).

The full feature table is in [docs/guide/features.md](docs/guide/features.md).

### Run it locally

Requires Node.js 22.13 or newer 22.x and npm 10 or newer.

```bash
npm ci          # install the exact locked dependencies
npm run dev     # start the dev server at http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript type-check (app and Vite config) |
| `npm run lint` | ESLint 10, warnings are errors |
| `npm run lint:strict` | Stricter react-hooks rules; the count per rule may not grow past its recorded baseline |
| `npm test` | Vitest unit and integration tests |
| `npm run build` | Type-check, then production build |
| `npm run build && npm run budget` | Fail if the first-page JavaScript/CSS or a lazy chunk exceeds its gzip budget |
| `npm run build && npm run e2e` | Real-Chrome accessibility, CSP and layout check (needs Chrome, see `CHROME_PATH`) |

### More documentation

- [Getting started](docs/guide/getting-started.md), [usage and shortcuts](docs/guide/usage.md), [performance ledger](docs/guide/performance-ledger.md),
  [privacy and storage](docs/guide/privacy-and-storage.md), [deployment](docs/guide/deployment.md)
- [Technology stack and project structure](docs/guide/project-structure.md),
  [testing and performance](docs/guide/testing-and-performance.md), [contributing](docs/guide/contributing.md)
- [Architecture overview](docs/ARCHITECTURE.md): how it works, security, lessons learned
- AI-assistant setup (rules, skills, agents, hooks): [`CLAUDE.md`](CLAUDE.md) and [`.claude/`](.claude/README.md)

Released under the [MIT License](LICENSE).

## Future additions

None of these is implemented yet. They are listed in a suggested order of priority.

**Quality and accessibility**
- [ ] Run `e2e:screens` in CI and extend it to the upload screens (CI currently runs only `npm run e2e`).
- [ ] Turn on the stricter React-hooks rules of `eslint-plugin-react-hooks` 7 (`refs`, `set-state-in-effect`,
      `purity`) in a dedicated change.
- [ ] Automated verification of the Anki export against a real Anki import.

**Product**
- [ ] Interface translation (the UI is currently Arabic/RTL only).
- [ ] Grammar reader for more languages (French, Spanish, Italian, Dutch, …); German is done.
- [ ] Optional offline German dictionary built from Wiktionary data (no per-click request).
