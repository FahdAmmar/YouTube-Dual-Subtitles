# DUAL_SUB — Features in detail

[← Architecture overview](../ARCHITECTURE.md)

## Features

### 🎬 Dual-subtitle player

- **Three sources:** YouTube (through `youtube-nocookie.com`), Vimeo, or a local video file played from a `Blob` URL that never uploads anywhere.
- **Formats:** SRT, VTT, ASS and SSA, plus a **bilingual single file** (two lines per cue, split into both tracks automatically). Files are validated by extension and capped at 2 MB.
- **Independent tracks:** each language has its own colour, size, line height and width. Each burned-in line **drags on its own** anywhere inside the video, and one button moves the whole block between the bottom, middle and top of the picture (double-click a line to send it back).
- **Choose a track's language:** each file row in the sidebar has a language selector listing all supported languages (Arabic, English, French, Spanish, German, Italian, Portuguese, Turkish, Persian, Urdu, Hebrew, Russian, Chinese, Japanese, Korean, Hindi, Indonesian, Dutch). An explicit pick always wins over language auto-detection (which only recognises Arabic/English/German) and survives reloads; *تلقائي* hands control back to detection.
- **Pick one language:** one tap on the video cycles *both → translation only → source only*; the sidebar and reading-mode toggles name the languages (`AR`, `EN`) instead of a generic "source / translation".
- **Words on the video:** click a word of the translation line to see its meaning in a card over the picture (a bottom sheet on phones, `Esc` closes it) — the same lookup, cache, vocabulary list and privacy switch as the sidebar. Press-and-drag still moves the line; only a click opens the card.
- **Sync control:** nudge each track in small steps, or use **two-point sync** to fix subtitles that drift (frame-rate mismatches). Offsets are remembered per video and file.
- **Synchronized transcript:** every line is a card with its timestamp; the current one is highlighted and kept in view, search finds text in either language, and clicking a line jumps to it.
- **Study tools:** recall mode (hide the translation until you ask), shadowing mode (auto-pause after every line), repeat the current line 2–4 times, bookmarks, text-to-speech with a voice picker, playback speed up to 2×.
- **Everywhere:** keyboard shortcuts for everything, touch gestures, Picture-in-Picture, Media Session (lock-screen controls), fullscreen, resumes where you stopped.

### 🏠 Home navigation

The header shows a **home button** in the player layout (it is hidden on the home screen itself, where there is nothing to return to). It triggers exactly the same path as the player's own "تغيير الفيديو" (change video) button: the local video's object URL is revoked, both subtitle tracks reset, and the screen returns to the video-selection page with its watch history.

### 📖 Reading mode — lyrics for any video

Press **`T`** (or the book icon). The transcript becomes a list of cards that follows the audio:

- **The word being spoken is highlighted.** YouTube's automatic captions saved as `.vtt` carry the start time of every word and are followed exactly; any other file has no per-word timing, so the highlight is **estimated** from word length and pauses at punctuation.
- Foreign text large, your language below it; swap them, hide timestamps, resize the text, switch between *source / translation / both / recall*.
- ±10 s, previous/next line, **0.25× speed steps**, and a **repeat this line** loop.
- **Copy** one line or the whole transcript (both languages, or only one).
- **Search** the text; handles videos with thousands of lines — only the cards near the screen exist in the DOM.
- Click a word for its meaning, read a line aloud with your device's voice, bookmark it.
- Keeps the screen awake while playing. Local files can be played as audio only.

### 🎓 Vocabulary that sticks

- Click any word → meaning and translation (Wiktionary + MyMemory), plus for German the article, plural, verb forms and lemma → **save it with the sentence, video and time** it came from.
- **Spaced-repetition review** (Leitner boxes) with fill-in-the-blank cards, answer grading with the next interval shown, and a button that jumps to the exact moment in the video.
- **Saved words are underlined** on the video and in reading mode (a dotted underline, not only colour), so the learner sees what they already know.
- A vocabulary list with **search** (accent- and case-insensitive, across word, lemma, meaning, sentence and note), **status filters**, **sorting**, a **"this video only"** filter, **personal notes**, and **undo** after a removal.
- Review by **keyboard** (`Space` reveals, `1`/`2`/`3` grade), with a progress bar, an end-of-session summary, **pronunciation**, and a cap on new words per session.
- A **daily goal** (10 reviews) and a **streak** that counts a day after one minute of watching *or* five reviews.
- **Export** to CSV, or to an **Anki Cloze** file (the sentence with `{{c1::word::translation}}` and a link to the exact YouTube moment).

### 🧰 Getting and fixing subtitles

- **Drop or paste** subtitle files — or the subtitle *text* itself — anywhere on the page.
- **Auto-captions cleaned up:** YouTube's "rolling" captions (every cue repeating the previous line) collapse to one clean cue per phrase.

### 🔒 Your data, your device

- **Watch history** with progress, saved sync offsets and (optionally) the subtitle files themselves in IndexedDB, restored next time.
- **Backup & restore** everything to one JSON file; learning stats, vocabulary and settings included.
- Installable **PWA**; works offline once loaded (video itself aside).

### ♿ Accessible by construction

- Dark and light themes designed separately (not inverted), system preference respected, `prefers-reduced-motion` honoured.
- Semantic HTML, visible focus, labelled controls, focus-trapped dialogs, full keyboard operation.
- Text colour tokens are held to **WCAG AA (4.5:1)** against every surface in both themes by a unit test that reads `src/index.css`.
- Reading mode is checked with **axe-core in real Chrome** (WCAG 2 A/AA, including colour contrast) in both themes and on phone and desktop sizes.

<details>
<summary><b>Keyboard shortcuts</b></summary>

| Key | Action | Key | Action |
| --- | --- | --- | --- |
| `Space` | Play / pause | `T` | Open / close reading mode |
| `←` `→` | Previous / next line | `S` | Shadowing mode on / off |
| `↑` `↓` | Volume | `R` | Reveal translation (recall mode) |
| `C` `X` `Z` | Faster / slower / reset speed | `B` | Bookmark the current line |
| `F` | Fullscreen | `/` | Focus the transcript search |
| `0` `1` `2` `3` | Restart line / repeat 2× / 3× / 4× | `?` | Show the shortcuts panel |

</details>
