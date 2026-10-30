# DUAL_SUB — Technology stack and project structure

[← Back to the README](../../README.md)

## Technology Stack

| Category | Technology | Details |
|---|---|---|
| UI framework | **React 18** | Hooks-based; no state-management library, no router, no UI kit |
| Language | **TypeScript 5** | Strict mode, including `noUncheckedIndexedAccess` |
| Build tool | **Vite 7** + `vite-plugin-pwa` | Code splitting, service worker, and web manifest |
| Styling | **Tailwind CSS 4** | CSS-first theme (`@theme` in `src/index.css`); design tokens as CSS variables; logical properties for RTL |
| Animation | **Framer Motion 11** | Loaded via `LazyMotion` (`m.*` components) so the animation engine arrives after first paint |
| Virtualization | **@tanstack/react-virtual** | Reading-mode list with variable-height rows |
| Icons | **lucide-react** | Consistent icon set |
| Unit/integration tests | **Vitest 4** + Testing Library + jsdom | Plus `fake-indexeddb` for storage APIs |
| Real-browser checks | **puppeteer-core** + **axe-core** | Accessibility (WCAG), CSP violations, and layout in real Chrome |
| Linting | **ESLint 10** (flat config) + typescript-eslint | Zero-warning policy |
| CI | **GitHub Actions** | Type-check, lint, tests, build and e2e on every push and pull request |
| Hosting | **Vercel** | Static deployment configured by `vercel.json` |

**Runtime dependencies are deliberately few:** `react`, `react-dom`, `framer-motion`, `lucide-react`, `@tanstack/react-virtual`, `clsx`, and `tailwind-merge` (which lets a caller's class override a component's default) — nothing else ships to the browser except `workbox-window`, which the PWA plugin bundles for the update prompt. There is no HTTP client, no router, and no state library.

Fonts (IBM Plex Sans, Sans Arabic, and Mono) are self-hosted under the SIL Open Font License; subsets are split by `unicode-range` so a normal visit downloads only the Latin/Arabic parts.

---

## Project Structure

```
.
├── src/
│   ├── App.tsx                  # LazyMotion provider and app root
│   ├── main.tsx                 # React entry point
│   ├── index.css                # Tailwind layers, design tokens, base styles
│   ├── components/              # Organized by feature area
│   │   ├── layout/              # AppShell (start screen), WatchScreen (lazy), header, resizable panels
│   │   ├── video/               # Video stage, control bar, subtitle overlay, gestures
│   │   ├── subtitles/           # Draggable subtitle lines, clickable words, sync controls
│   │   ├── console/             # Transcript list, glossary, word card, upload rows
│   │   ├── reading/             # Reading-mode cards, dock, and tools
│   │   ├── settings/            # Settings, backup/restore, storage usage, voice picker
│   │   ├── system/              # Error boundary, drag-and-drop overlay
│   │   └── ui/                  # Generic, reusable primitives only
│   ├── hooks/                   # One behavior per hook (players, clocks, persistence, shortcuts)
│   ├── context/                 # Cross-cutting UI state: theme, subtitle settings, current video
│   ├── constants/               # Keyboard shortcuts, supported languages, theme tokens
│   ├── types/                   # Shared TypeScript types
│   ├── styles/                  # Additional stylesheets
│   ├── lib/                     # Pure, framework-free logic — independently testable
│   │   ├── subtitles/           # SRT/VTT/ASS parsers, cue pairing, word timing, sync math
│   │   ├── utils/               # Storage, backup, vocabulary, review scheduling, exports, word lookup
│   │   ├── dictionary/          # Wiktionary grammar reader (article, plural, verb forms, lemma)
│   │   ├── youtube/ vimeo/      # URL parsing and player-specific helpers
│   │   ├── csp/                 # Build-time Content-Security-Policy generator
│   │   └── deploy/              # Base path, share URLs, font verification
│   └── __tests__/               # Integration tests (the whole app rendered in jsdom)
├── scripts/
│   ├── check-bundle-budget.mjs  # Gzip budgets for the first page and the lazy chunks (npm run budget)
│   └── check-strict-lint.mjs    # Ratchet for the stricter react-hooks rules (npm run lint:strict)
├── e2e/
│   ├── reading-mode.a11y.mjs    # Real-Chrome accessibility, CSP, and layout checks (reading mode)
│   └── screens.a11y.mjs         # Real-Chrome accessibility checks: home, settings, vocabulary, review
├── docs/
│   ├── ARCHITECTURE.md          # Architecture overview and index of the detailed documents
│   ├── architecture/            # How it works, security, lessons learned, roadmap
│   ├── guide/                   # Getting started, usage, deployment, contributing
│   └── images/                  # Screenshots used in the README
├── public/                      # Fonts, icons, manifest assets, robots.txt, og-image
├── .github/workflows/
│   └── ci.yml                   # Type-check, lint, tests, build, e2e on every push/PR
├── index.html                   # Entry page (HTML metadata, font preloads, inline theme script)
├── vite.config.ts               # React plugin, PWA, build-time CSP, and share-metadata plugins
├── vitest.config.ts             # Test setup (jsdom environment, path aliases)
├── vercel.json                  # Vercel build settings, security and caching headers
├── tsconfig.json / .app.json / .node.json    # TypeScript project references
├── eslint.config.js             # ESLint flat configuration
├── .nvmrc                       # Pinned Node version (22)
├── LICENSE                      # MIT license
└── CLAUDE.md  .claude/          # Project conventions (also read by AI coding assistants)
```

### Design principles behind the structure

- **Player adapter pattern** — the YouTube, Vimeo, and local players (`useYouTubePlayer`, `useVimeoPlayer`, `useLocalVideoPlayer`) are unified behind a single `useVideoPlayer` interface, so consumers never depend on a specific platform. Adding a source means adding one adapter hook.
- **Logic lives in `src/lib/`**, hooks in `src/hooks/`, and feature components in `src/components/`. Cross-cutting UI state only goes through `src/context/`.
- **Deployment configuration is guarded by tests** — `src/lib/deploy/hostConfigs.test.ts` checks `vercel.json` (headers, caching, install/build commands) and the pinned Node version.
