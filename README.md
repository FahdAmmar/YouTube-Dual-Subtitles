# DUAL_SUB

> **YouTube • Vimeo • Local Video** — Two subtitle tracks, one timeline. Read along, look up words, remember what you learn.

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=react,ts,vite,tailwind,vitest,eslint,nodejs,npm,github,githubactions,netlify,vercel,cloudflare,puppeteer&perline=14" alt="Tech stack icons" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License: MIT" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 7" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 3.4" />
  <img src="https://img.shields.io/badge/Vitest-4.1-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/PWA-installable-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/Accessibility-axe--core_checked-1F6FEB?style=flat-square" alt="Accessibility" />
</p>

---

## Why this exists

Language learning from video is broken. You get one subtitle track, or none. You can't see the original and the translation together. You can't click a word for its meaning without leaving the player. You can't review what you learned.

**DUAL_SUB fixes all of that.**

| Feature | Description |
|---|---|
| 🎬 **Dual subtitles** | Source + translation on the video, each draggable, each styleable |
| 📖 **Reading mode** | Lyrics-style view, word highlighted as it's spoken |
| 🧠 **Vocabulary** | Click any word → definition + translation → saved with context |
| 🔁 **Spaced repetition** | Leitner boxes, fill-in-the-blank, export to Anki |
| 💾 **Local-first** | Zero server. Your data never leaves your browser. |
| 📱 **PWA** | Install it. Works offline. |

---

## Quick start

```bash
# Requirements: Node 22, npm ≥ 10
git clone https://github.com/your-username/youtube-dual-subtitles.git
cd youtube-dual-subtitles
npm ci
npm run dev          # http://localhost:5173
```

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Type-check → production build (`dist/`) |
| `npm run preview` | Serve production build locally |
| `npm run typecheck` | `tsc --noEmit` (app + Vite config) |
| `npm run lint` | ESLint, zero warnings |
| `npm test` | Unit + integration tests |
| `npm run e2e` | Real Chrome a11y/CSP/layout check |

---

## How to use

1. **Open a video** — Paste a YouTube/Vimeo URL or pick a local file
2. **Add subtitles** — Drop `.srt`, `.vtt`, `.ass` files (or paste text). Two files = source + translation
3. **Sync if needed** — Nudge offsets or use two-point sync for drifting subs
4. **Watch** — `Space` play/pause, `←/→` previous/next line, `T` reading mode
5. **Learn** — Click any word → see meaning → save to vocabulary → review later

---

## Screenshots

| Start screen | Player (dual subs) | Reading mode | Mobile |
|--------------|-------------------|--------------|--------|
| ![](docs/images/12-home-with-watch-history.webp) | ![](docs/images/13-player-dual-subtitles.webp) | ![](docs/images/14-reading-mode-desktop.webp) | ![](docs/images/15-player-mobile.webp) |

---

## Tech stack

| Category | Tools |
|----------|-------|
| **Framework** | <img src="https://skillicons.dev/icons?i=react" width="20" alt="React" /> React 18, <img src="https://skillicons.dev/icons?i=ts" width="20" alt="TypeScript" /> TypeScript 5.9 (strict) |
| **Build** | <img src="https://skillicons.dev/icons?i=vite" width="20" alt="Vite" /> Vite 7, `vite-plugin-pwa` |
| **Styling** | <img src="https://skillicons.dev/icons?i=tailwind" width="20" alt="Tailwind CSS" /> Tailwind CSS 3.4 (CSS variables, logical properties, RTL) |
| **Animation** | 🎞️ Framer Motion via `LazyMotion` (`m.*` components) |
| **Virtualization** | 📦 `@tanstack/react-virtual` |
| **Icons** | <img src="https://cdn.jsdelivr.net/gh/lucide-icons/lucide@latest/icons/lucide.svg" width="20" alt="Lucide" /> Lucide React |
| **Testing** | <img src="https://skillicons.dev/icons?i=vitest" width="20" alt="Vitest" /> Vitest + React Testing Library (jsdom) |
| **E2E** | <img src="https://skillicons.dev/icons?i=puppeteer" width="20" alt="Puppeteer" /> Puppeteer + axe-core (real Chrome) |
| **Lint** | <img src="https://skillicons.dev/icons?i=eslint" width="20" alt="ESLint" /> ESLint 8 (ESLint 9 migration planned) |
| **CI/CD** | <img src="https://skillicons.dev/icons?i=githubactions" width="20" alt="GitHub Actions" /> GitHub Actions → <img src="https://skillicons.dev/icons?i=vercel" width="20" alt="Vercel" /> Vercel / <img src="https://skillicons.dev/icons?i=github" width="20" alt="GitHub Pages" /> GitHub Pages / <img src="https://skillicons.dev/icons?i=netlify" width="20" alt="Netlify" /> Netlify / <img src="https://skillicons.dev/icons?i=cloudflare" width="20" alt="Cloudflare" /> Cloudflare |

**Runtime deps:** React, React DOM, Framer Motion, Lucide, TanStack Virtual, `clsx` — *that's it.*

---

## Project structure

```
src/
├── components/
│   ├── layout/       AppShell, header, resizable panels
│   ├── video/        Stage, controls, subtitle overlay, gestures
│   ├── subtitles/    Draggable lines, clickable words, sync controls
│   ├── console/      Transcript, glossary, word card, upload
│   ├── reading/      Reading mode cards, dock, tools
│   ├── settings/     Settings, backup, storage, voice picker
│   ├── system/       Error boundary, drop overlay
│   └── ui/           Generic primitives only
├── hooks/            One behaviour per hook (players, persistence, shortcuts…)
├── lib/
│   ├── subtitles/    Parsers (SRT/VTT/ASS), pairing, sync math, cleanup
│   ├── utils/        Storage, backup, vocabulary, review, export, lookup
│   ├── csp/          Build-time CSP generator
│   └── deploy/       Base path, share URLs, font verification
├── context/          Theme, subtitle settings, current video
├── constants/        Shortcuts, storage keys, shared types
└── __tests__/        Integration tests (full app in jsdom)

e2e/                  Real-Chrome a11y/CSP/layout verification
docs/                 ARCHITECTURE.md + screenshots
public/               Fonts, icons, headers, manifest
.github/workflows/    CI + deploy pipelines
```

---

## Architecture highlights

- 🔌 **Player Adapter pattern** — YouTube, Vimeo, and local file players behind one `useVideoPlayer` interface
- 🔄 **Subtitle pipeline** — Parse → dedupe rolling captions → align word timings → pair cues → unified timeline
- ⚡ **Reading mode** — Only active line polls clock; virtualized list (870 nodes vs 108k for 3k lines)
- 🎯 **Word highlight** — Exact timings from YouTube VTT when available; length-based estimate otherwise
- 📚 **Spaced repetition** — Leitner boxes (10m → 1d → 3d → 7d → 14d → 30d), fill-in-the-blank cards
- 🗄️ **Data layer** — `localStorage` for settings/history/vocab; IndexedDB for subtitle files; one-file backup/restore

---

## Privacy

| Aspect | Details |
|--------|---------|
| 🚫 **No backend** | No server, no database, no analytics |
| 💾 **Local storage** | Videos, subtitles, vocabulary, history — all in your browser |
| 🔍 **Optional lookup** | Click a word → sends *that word only* to Wiktionary + MyMemory |
| 🔘 **Toggle** | Settings → Privacy → disable lookup entirely |
| 🛡️ **CSP** | Strict policy: scripts self-only, network to dictionaries only, embeds YouTube/Vimeo only |
| 🍪 **Embeds** | YouTube via `youtube-nocookie.com` |

---

## Deployment

```bash
# Any static host works. Build output: dist/
npm run build
```

| Platform | Config |
|----------|--------|
| <img src="https://skillicons.dev/icons?i=vercel" width="20" alt="Vercel" /> **Vercel** | `vercel.json` — auto-detected, zero config needed |
| <img src="https://skillicons.dev/icons?i=github" width="20" alt="GitHub Pages" /> **GitHub Pages** | `.github/workflows/deploy.yml` — push to `main` |
| <img src="https://skillicons.dev/icons?i=netlify" width="20" alt="Netlify" /> **Netlify** | `netlify.toml` + `public/_headers` |
| <img src="https://skillicons.dev/icons?i=cloudflare" width="20" alt="Cloudflare" /> **Cloudflare Pages** | Build: `npm run build`, Output: `dist` |

**Vercel deploy (one-liner):**
```bash
npx vercel --prod
```

Environment variables (optional):
- `SITE_URL` — Absolute URL for share images (auto-derived on Vercel)
- `BASE_PATH` — Subfolder hosting (e.g. `/dual-subs/`) — GitHub Pages only

---

## Quality gates

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run e2e
```
Runs on every push/PR via GitHub Actions.

---

## Performance (production build, headless Chrome, cold cache)

| Metric | Value |
|--------|-------|
| First-visit transfer | 403 KB (15 requests) |
| JS for first paint | 107 KB gzip (+19 KB lazy motion) |
| Fonts on first visit | 256 KB (Latin only; rest via `unicode-range`) |
| SW install size | 878 KiB (28 files) |
| `dist/` total | 1.4 MB |

---

## Roadmap

- [ ] Interface translation (UI is Arabic/RTL only)
- [ ] ESLint 9 flat config + Tailwind 4
- [ ] Axe checks for vocabulary/settings/upload screens
- [ ] Real Anki import test
- [ ] Lemma-aware lookup for inflected forms

---

## License

[MIT](LICENSE) — Fonts (IBM Plex) under SIL Open Font License (`public/fonts/LICENSES/`).

---

## Credits

- **Playback:** YouTube IFrame API, Vimeo Player SDK
- **Dictionaries:** Wiktionary (definitions), MyMemory (translations)
- **Fonts:** IBM Plex Sans, Sans Arabic, Mono
- **Icons:** <img src="https://cdn.jsdelivr.net/gh/lucide-icons/lucide@latest/icons/lucide.svg" width="18" alt="Lucide" /> Lucide
- **Libraries:** 📦 TanStack Virtual, 🎞️ Framer Motion, <img src="https://skillicons.dev/icons?i=puppeteer" width="18" alt="" /> axe-core, Puppeteer
- **Videos in screenshots:** Public German-learning content from YouTube (creators retain rights)

---

<div align="center">
<sub>If this helps your language learning, a ⭐ on GitHub is appreciated.</sub>
</div>