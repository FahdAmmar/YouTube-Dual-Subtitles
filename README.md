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
- **Sidebar side swap** — a dedicated toggle instantly moves the sidebar between the left and right of the video, correctly on any text direction; the choice persists across sessions
- **Collapsible upload panel** — auto‑collapses once both subtitle files are ready, freeing up space for the transcript
- Fully responsive: fixed‑height dashboard with independent scroll regions on desktop, and a mobile layout where the video stays pinned (`sticky`) at the top with a compact, non‑scrolling "now playing" caption strip underneath it
- Mobile‑tuned controls: comfortable touch‑sized buttons throughout, an always‑visible (not hover‑only) seek handle, the volume slider gives way to a simple mute toggle on narrow screens to avoid crowding the control bar, and text inputs are sized to avoid iOS Safari's auto‑zoom‑on‑focus
- Full RTL/LTR support with automatic per‑line text direction detection

### 🎬 Two Ways to Watch

- **YouTube URL** — paste any link, works exactly as before
- **Local video file** — upload a file straight from your device (MP4, WebM, MOV, MKV...); it never leaves the browser (played via a local Object URL, nothing is uploaded to any server)
- Both paths lead to the *exact same* viewing experience — same custom control bar, same keyboard shortcuts, same dual‑subtitle overlay and transcript panel. A single unified player interface (`useVideoPlayer`) sits in front of both, so no other part of the app needs to know or care which one is active

### 🌐 Dual Subtitle Power

- Upload **any two independent SRT/VTT files** (different sources, different segmentations)
- **Upload a single bilingual SRT/VTT file** — each cue containing both languages (typically one line per language) is automatically split into the two tracks by detecting each line's writing direction (RTL → source, LTR → translation), with a positional fallback for same‑direction language pairs; both tracks appear with the exact same design as if two separate files were uploaded
- Frame‑accurate sync using `O(log n)` binary‑search cue lookup
- Per‑track manual sync offset (±15s) to correct mistimed files — baked directly into the transcript highlight, so it never drifts from what's burned into the video overlay
- Live transcript panel with the active segment highlighted in real time, including an animated progress bar tracking position within that exact segment
- **Draggable burned‑in captions** — drag the subtitle bubble anywhere within the video frame (e.g. to avoid covering on‑screen text), constrained to the video's own bounds; double‑click to reset, position persists across sessions
- Toggle view mode: source only, translation only, or both side‑by‑side
- Export subtitles as SRT — source only, translation only, or merged bilingual file

### ⌨️ Playback & Keyboard Shortcuts

- `Space` — play / pause
- `C` — speed up by 0.5× (up to 2×) · `X` — slow down by 0.5× (down to 0.25×) · `Z` — reset to 1×
- `F` — toggle fullscreen
- `←` / `→` — jump to the previous / next subtitle scene
- `↑` / `↓` — volume up / down
- `0` — restart the current scene from its beginning (play once, no loop)
- `1` — repeat the current scene **twice** · `2` — **three** times · `3` — **four** times (a persistent on‑screen badge tracks loop progress, e.g. `2/3`)
- All shortcuts work identically whether watching a YouTube video or a local file
- All shortcuts are automatically disabled while typing in any text field, and ignore modifier‑key combos (`Ctrl`/`Cmd`/`Alt`) so they never fight with browser shortcuts
- **Focus retention**: after clicking the YouTube video (which steals keyboard focus into the cross‑origin iframe), focus is automatically reclaimed by the stage container on the next pointer release, so shortcuts keep responding reliably — the keydown listener is also registered in the capture phase as a defensive measure
- Every shortcut has an on‑screen flash indicator (à la YouTube/Netflix) confirming the action, plus a clickable equivalent in the control bar (a speed menu) for mouse/touch users
- **Not included: a YouTube resolution/quality picker.** YouTube [officially discontinued](https://developers.google.com/youtube/iframe_api_reference) programmatic quality control for embeds — `setPlaybackQuality` and the `vq` load‑time hint are both documented no‑ops today, so a quality selector for YouTube videos here would just be a fake control that does nothing. Quality is fully automatic (adaptive bitrate) on YouTube's side. This doesn't apply to local file uploads, which always play at their native, unmodified quality.

### 🚀 Technical Highlights

- **Type Safety**: Full TypeScript codebase, strict null checks, shared types across parsing, sync, and UI
- **Player adapter pattern**: `useYouTubePlayer` and `useLocalVideoPlayer` independently implement the same control‑surface shape; `useVideoPlayer` composes them behind one interface, so `VideoControlBar`, `SubtitleOverlay`, and the keyboard shortcuts hook are entirely source‑agnostic
- **Isolated Re‑renders**: Video time is exposed as an imperative getter via `useSyncExternalStore`; only subscriber components update on tick, and transcript cards are memoized so only the active one re‑renders during playback
- **`overflow-x: clip`, not `hidden`**: the global horizontal‑overflow safety net in `index.css` deliberately uses `clip` — `hidden` on `html`/`body` is a well‑known way to silently break `position: sticky` on descendants (it creates a new scroll/formatting context), which would have broken the mobile sticky video. `clip` gets the same "no horizontal scrollbar" result without that side effect.
- **Resilient by design**: every external browser/YouTube/media API call (`matchMedia`, `scrollIntoView`, the Fullscreen API, `HTMLMediaElement.play()`, and the entire YouTube postMessage bridge) is wrapped defensively — a temporary hiccup degrades gracefully instead of crashing the app
- **Performance**: binary‑search cue matching, 2 MB subtitle file size cap, code‑split settings panel
- **Security**: XSS‑safe by construction, no `dangerouslySetInnerHTML`, strict URL validation, `youtube-nocookie.com`; local video files are validated by MIME type/extension and never transmitted anywhere
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
│   │   ├── 📄 local-video-upload.test.tsx
│   │   ├── 📄 matchmedia-crash.test.tsx
│   │   ├── 📄 mobile-active-caption.test.tsx
│   │   ├── 📄 repro.test.tsx
│   │   ├── 📄 resizable-sidebar.test.tsx
│   │   ├── 📄 sidebar-position-logic.test.ts
│   │   ├── 📄 sidebar-position-toggle.test.tsx
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
│   │       ├── 📄 LocalVideoPlayerView.tsx
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
│   │   ├── 📄 useLocalVideoPlayer.ts
│   │   ├── 📄 usePlayerTime.ts
│   │   ├── 📄 useResizableSidebarWidth.ts
│   │   ├── 📄 useSidebarPosition.ts
│   │   ├── 📄 useSubtitleTrack.ts
│   │   ├── 📄 useTheme.ts
│   │   ├── 📄 useVideoPlayer.ts
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
│   │   │   ├── 📄 safePlayerCall.ts
│   │   │   └── 📄 sanitize.ts
│   │   └── 📁 youtube
│   │       ├── 📄 extractVideoId.ts
│   │       └── 📄 loadYouTubeIframeAPI.ts
│   ├── 📁 styles
│   │   └── 🎨 tokens.css
│   ├── 📁 types
│   │   ├── 📄 subtitle.types.ts
│   │   ├── 📄 theme.types.ts
│   │   ├── 📄 video.types.ts
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
- Local video uploads are validated by MIME type/extension, played via a local `Blob` Object URL, and never transmitted to any server — the file never leaves the browser.
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
