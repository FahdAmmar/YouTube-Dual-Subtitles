# DUAL_SUB — Features, architecture and project notes

> Every feature, how the pieces fit together, the tech stack, privacy and security, testing, deployment,
> lessons learned and known limitations.

---


## Contents

- [Features in detail](architecture/features.md)
- [How it works](architecture/how-it-works.md) — pipeline, reading mode, word lookup, spaced repetition, where data lives
- [Privacy, security, deployment and testing](architecture/security-deployment-testing.md)
- [Lessons learned](architecture/lessons-learned.md) — including the ESLint 10 / Tailwind 4 upgrade
- [Known limitations, roadmap and contributing](architecture/roadmap-contributing.md)
- Task guides for users and contributors: [getting started](guide/getting-started.md), [usage](guide/usage.md), [deployment](guide/deployment.md)

## Tech stack

| | Technology | Version | Why it is here |
| --- | --- | --- | --- |
| <img src="https://skillicons.dev/icons?i=react" width="28" alt="React" /> | **React** | 18.3 | Component model; hooks keep each behaviour in one small unit |
| <img src="https://skillicons.dev/icons?i=ts" width="28" alt="TypeScript" /> | **TypeScript** | 5.9 | Strict types across the whole code base, including tests |
| <img src="https://skillicons.dev/icons?i=vite" width="28" alt="Vite" /> | **Vite** + `vite-plugin-pwa` | 7.3 | Fast builds, code splitting, service worker and manifest |
| <img src="https://skillicons.dev/icons?i=tailwind" width="28" alt="Tailwind CSS" /> | **Tailwind CSS** | 4.3 | Design tokens as CSS variables → two real themes, logical properties for RTL |
| 🎞️ | **Framer Motion** | 11.18 | Purposeful, subtle motion; disabled for `prefers-reduced-motion`. Loaded through `LazyMotion` (`m.*` components): the animation engine arrives in a separate chunk after the first paint |
| 🧭 | **Lucide React** | 0.454 | Consistent icon set |
| 📜 | **TanStack Virtual** | 3.14 | Reading-mode list with variable-height rows |
| <img src="https://skillicons.dev/icons?i=vitest" width="28" alt="Vitest" /> | **Vitest** + Testing Library + jsdom | 4.1 | Fast unit and integration tests |
| 🌐 | **puppeteer-core** + **axe-core** | 25.12 / 4.14 | Real-Chrome checks of layout, accessibility and CSP |
| <img src="https://skillicons.dev/icons?i=eslint" width="28" alt="ESLint" /> | **ESLint** | 10.13 | Flat config, zero-warning lint policy (see [roadmap](architecture/roadmap-contributing.md#known-limitations-and-roadmap)) |
| <img src="https://skillicons.dev/icons?i=githubactions" width="28" alt="GitHub Actions" /> | **GitHub Actions** | — | CI (lint, tests, build, real-browser check) and Pages deployment |

Runtime dependencies are deliberately few: React, React DOM, Framer Motion, Lucide, TanStack Virtual and `clsx`. There is no state-management library, no router, no UI kit and no HTTP client.

**Fonts** are self-hosted IBM Plex Sans, Sans Arabic and Mono (no request to a font CDN); their SIL Open Font Licence texts are in `public/fonts/LICENSES/`. Sans and Mono are split by `unicode-range` (Latin, Latin-extended, Cyrillic, Greek, symbols), so a normal visit downloads only the Latin part; `src/lib/deploy/fontFiles.test.ts` checks that every file the stylesheet names exists and that none is left unused.

---


---

## Project structure

```
.
├── src/
│   ├── components/
│   │   ├── layout/        AppShell (start screen), WatchScreen (lazy orchestrator), header, resizable panels
│   │   ├── video/         stage, control bar, subtitle overlay, gestures, stats card
│   │   ├── console/       transcript list, cards, glossary, word card, upload rows
│   │   ├── reading/       reading mode: cards, dock, tools, now-playing card
│   │   ├── subtitles/     draggable subtitle lines, clickable words, quick controls, sync controls
│   │   ├── settings/      settings, backup, storage usage, voice picker
│   │   ├── system/        error boundary, drop overlay
│   │   └── ui/            generic, reusable primitives only
│   ├── hooks/             one behaviour per hook (players, clocks, persistence, shortcuts…)
│   ├── lib/
│   │   ├── subtitles/     parsers, pairing, rolling-caption cleanup, word timing, sync maths
│   │   ├── utils/         storage, backup, vocabulary, review scheduling, exports, lookup
│   │   ├── dictionary/    Wiktionary grammar reader: headword-line parser, section parser, Action API client
│   │   ├── csp/ deploy/   build-time helpers (security policy, base path, share URLs)
│   │   └── youtube/ …     URL parsing and player adapters
│   ├── context/           theme, subtitle settings, current video key
│   ├── constants/ types/  tokens, shortcuts, storage keys, shared types
│   └── __tests__/         integration tests (whole app in jsdom)
├── e2e/                   real-Chrome check: axe (WCAG), CSP violations, layout
├── public/                icons, fonts, robots.txt, og-image
├── docs/                  ARCHITECTURE.md (this file), architecture/, guide/, images/ (README screenshots, WebP)
├── .github/workflows/     ci.yml
├── vite.config.ts         build, PWA, CSP and share-metadata plugins
├── vercel.json  .vercelignore  .nvmrc
└── CLAUDE.md  .claude/    project conventions (also read by AI coding assistants)
```

About **14,100 lines** of source in 166 files and **8,500 lines** of tests in 104 files.

---


---
