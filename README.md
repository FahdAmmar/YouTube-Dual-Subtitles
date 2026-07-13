# 🎬 YouTube Dual Subtitles

<!-- Add a real screenshot at ./public/screenshot.png -->
<img align="center" src="./public/screenshot.png" width="1000px" height="500px" style="margin:auto" alt="YouTube Dual Subtitles" />

A fully client‑side web app for watching any YouTube video with **two synchronized subtitle tracks** in different languages, presented as a console‑style dashboard: video on one side, a live synced transcript panel on the other.

No backend. No database. No API keys. Everything runs in the browser.

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/Lucide-000000?style=for-the-badge&logo=lucide&logoColor=white" alt="Lucide" />
</p>

## ✨ Features

### 🎨 Console‑Style Dashboard

- Near‑black background with electric violet accents for all system chrome
- Distinct gold / teal colour identity for subtitle track A vs track B
- Dark / light theme with automatic system preference detection and manual toggle
- **Resizable sidebar** — hover the divider between video and transcript to reveal a drag handle (mouse or keyboard), width persists across sessions
- **Collapsible upload panel** — auto‑collapses once both subtitle files are ready, freeing up space for the transcript
- Fully responsive: fixed‑height dashboard with independent scroll regions on desktop, and a mobile layout where the video stays pinned (`sticky`) at the top with a compact, non‑scrolling "now playing" caption strip underneath it
- Full RTL/LTR support with automatic per‑line text direction detection

### 🌐 Dual Subtitle Power

- Upload **any two independent SRT/VTT files** (different sources, different segmentations)
- Frame‑accurate sync using `O(log n)` binary‑search cue lookup
- Per‑track manual sync offset (±15s) to correct mistimed files — baked directly into the transcript highlight, so it never drifts from what's burned into the video overlay
- Live transcript panel with the active segment highlighted in real time, including an animated progress bar tracking position within that exact segment
- **Draggable burned‑in captions** — drag the subtitle bubble anywhere within the video frame (e.g. to avoid covering on‑screen text), constrained to the video's own bounds; double‑click to reset, position persists across sessions
- Toggle view mode: source only, translation only, or both side‑by‑side
- Export subtitles as SRT — source only, translation only, or merged bilingual file

### ⌨️ Playback & Keyboard Shortcuts

- `Space` — play / pause
- `C` — speed up by 0.5× (up to 2×) · `X` — slow down by 0.5× (down to 0.25×)
- `F` — toggle fullscreen
- All shortcuts are automatically disabled while typing in any text field, and ignore modifier‑key combos (`Ctrl`/`Cmd`/`Alt`) so they never fight with browser shortcuts
- Every shortcut has an on‑screen flash indicator (à la YouTube/Netflix) confirming the action, plus a clickable equivalent in the control bar (a speed menu) for mouse/touch users
- **Not included:** a resolution/quality picker. YouTube [officially discontinued](https://developers.google.com/youtube/iframe_api_reference) programmatic quality control for embeds — `setPlaybackQuality` is a documented no‑op today, so a quality selector here would just be a fake control that does nothing. Quality is fully automatic (adaptive bitrate) on YouTube's side.

### 🚀 Technical Highlights

- **Type Safety**: Full TypeScript codebase, strict null checks, shared types across parsing, sync, and UI
- **Isolated Re‑renders**: Video time is exposed as an imperative getter via `useSyncExternalStore`; only subscriber components update on tick, and transcript cards are memoized so only the active one re‑renders during playback
- **Resilient by design**: every external browser/YouTube API call (`matchMedia`, `scrollIntoView`, the Fullscreen API, and the entire YouTube postMessage bridge) is wrapped defensively — a temporary hiccup degrades gracefully instead of crashing the app
- **Performance**: binary‑search cue matching, 2 MB subtitle file size cap, code‑split settings panel
- **Security**: XSS‑safe by construction, no `dangerouslySetInnerHTML`, strict URL validation, `youtube-nocookie.com`
- **Testing**: automated regression tests (Vitest + Testing Library) that reproduce real past crash scenarios before asserting the fix

---

## 🏗️ Project Structure

```
├── 📁 public
├── 📁 src
│   ├── 📁 __tests__
│   │   ├── 📁 testHelpers
│   │   │   └── 📄 mockYouTubePlayer.ts
│   │   ├── 📄 collapsible-upload-section.test.tsx
│   │   ├── 📄 draggable-subtitle-overlay.test.tsx
│   │   ├── 📄 flaky-player-bridge.test.tsx
│   │   ├── 📄 full-workflow.test.tsx
│   │   ├── 📄 keyboard-shortcuts.test.tsx
│   │   ├── 📄 matchmedia-crash.test.tsx
│   │   ├── 📄 mobile-active-caption.test.tsx
│   │   ├── 📄 repro.test.tsx
│   │   ├── 📄 resizable-sidebar.test.tsx
│   │   └── 📄 setup.ts
│   ├── 📁 components
│   │   ├── 📁 console
│   │   │   ├── 📄 ConsolePanel.tsx
│   │   │   ├── 📄 DownloadSubtitles.tsx
│   │   │   ├── 📄 SliceCard.tsx
│   │   │   ├── 📄 SourceFileRow.tsx
│   │   │   ├── 📄 TranscriptList.tsx
│   │   │   └── 📄 ViewModeToggle.tsx
│   │   ├── 📁 layout
│   │   │   ├── 📄 AppShell.tsx
│   │   │   ├── 📄 Footer.tsx
│   │   │   ├── 📄 Header.tsx
│   │   │   └── 📄 PanelResizeHandle.tsx
│   │   ├── 📁 settings
│   │   │   ├── 📄 FontSizeControl.tsx
│   │   │   ├── 📄 SettingsPanel.tsx
│   │   │   └── 📄 ThemeToggle.tsx
│   │   ├── 📁 subtitles
│   │   │   └── 📄 SyncOffsetControl.tsx
│   │   ├── 📁 system
│   │   │   └── 📄 ErrorBoundary.tsx
│   │   ├── 📁 ui
│   │   │   ├── 📄 Button.tsx
│   │   │   ├── 📄 Card.tsx
│   │   │   ├── 📄 ColorPicker.tsx
│   │   │   ├── 📄 IconButton.tsx
│   │   │   ├── 📄 Select.tsx
│   │   │   └── 📄 Slider.tsx
│   │   └── 📁 video
│   │       ├── 📄 MobileActiveCaption.tsx
│   │       ├── 📄 PlaybackShortcutToast.tsx
│   │       ├── 📄 SubtitleOverlay.tsx
│   │       ├── 📄 VideoControlBar.tsx
│   │       ├── 📄 VideoStage.tsx
│   │       ├── 📄 VideoTopBar.tsx
│   │       ├── 📄 VideoUrlForm.tsx
│   │       └── 📄 YouTubePlayerView.tsx
│   ├── 📁 constants
│   │   ├── 📄 languages.ts
│   │   └── 📄 theme.constants.ts
│   ├── 📁 context
│   │   ├── 📄 SubtitleSettingsContext.tsx
│   │   └── 📄 ThemeContext.tsx
│   ├── 📁 hooks
│   │   ├── 📄 useActiveCue.ts
│   │   ├── 📄 useDraggableOverlayPosition.ts
│   │   ├── 📄 useFullscreen.ts
│   │   ├── 📄 useKeyboardShortcuts.ts
│   │   ├── 📄 useLocalStorage.ts
│   │   ├── 📄 usePlayerTime.ts
│   │   ├── 📄 useResizableSidebarWidth.ts
│   │   ├── 📄 useSubtitleTrack.ts
│   │   ├── 📄 useTheme.ts
│   │   └── 📄 useYouTubePlayer.ts
│   ├── 📁 lib
│   │   ├── 📁 subtitles
│   │   │   ├── 📄 findActiveCue.ts
│   │   │   ├── 📄 pairCues.ts
│   │   │   ├── 📄 parseSRT.ts
│   │   │   ├── 📄 parseSubtitleFile.ts
│   │   │   ├── 📄 parseVTT.ts
│   │   │   └── 📄 serializeSRT.ts
│   │   ├── 📁 utils
│   │   │   ├── 📄 cn.ts
│   │   │   ├── 📄 formatPlaybackRate.ts
│   │   │   └── 📄 sanitize.ts
│   │   └── 📁 youtube
│   │       ├── 📄 extractVideoId.ts
│   │       ├── 📄 loadYouTubeIframeAPI.ts
│   │       └── 📄 safePlayerCall.ts
│   ├── 📁 styles
│   │   └── 🎨 tokens.css
│   ├── 📁 types
│   │   ├── 📄 subtitle.types.ts
│   │   ├── 📄 theme.types.ts
│   │   └── 📄 youtube.types.ts
│   ├── 📄 App.tsx
│   ├── 🎨 index.css
│   ├── 📄 main.tsx
│   └── 📄 vite-env.d.ts
├── ⚙️ .eslintrc.json
├── ⚙️ .gitignore
├── 📄 LICENSE
├── 📝 README.md
├── 🌐 index.html
├── ⚙️ package.json
├── 📄 postcss.config.js
├── 📄 tailwind.config.ts
├── ⚙️ tsconfig.app.json
├── ⚙️ tsconfig.json
├── ⚙️ tsconfig.node.json
├── 📄 vite.config.ts
└── 📄 vitest.config.ts
```

---
---

## Getting Started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/ (fully static)
npm run lint      # code quality check
npm run test      # automated regression tests (Vitest + Testing Library)
```

> **Windows note:** if `npm run dev` fails with a Rollup/native‑binary error (`Cannot find module @rollup/rollup-win32-x64-msvc`), delete `node_modules` and `package-lock.json`, then run `npm install` again — this regenerates them correctly for your platform.

---

## Security

- No API keys or secrets anywhere — the IFrame Player API requires none.
- Subtitle files are capped at 2MB and validated by extension before parsing.
- Playback runs through `youtube-nocookie.com`.
- All rendering goes through React's safe text-node escaping — no raw HTML injection path exists for user-supplied content.

---
---

## 📝 License

- This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details

---

---

## 👏 Acknowledgments

- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) — the playback engine this app is built around
- [Lucide](https://lucide.dev/) — the icon set used throughout the interface
- [IBM Plex](https://www.ibm.com/plex/) — the Sans Arabic and Mono typefaces used for content and console chrome
- The React, Vite, Tailwind CSS, and Framer Motion communities, whose tools make an app like this possible with zero backend

---
