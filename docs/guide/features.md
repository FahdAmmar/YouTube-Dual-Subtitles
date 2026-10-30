# DUAL_SUB — Overview and features

[← Back to the README](../../README.md)

## Overview

**DUAL_SUB** (`youtube-dual-subtitles`) is a client-side React application that plays YouTube, Vimeo, or local video files with **two synchronized subtitle tracks** — the source language and a translation — plus a lyrics-style reading mode and a built-in vocabulary trainer.

Its core value proposition is that it is **fully local-first**:

- No backend, no database, no analytics, no login.
- No API keys or third-party required services.
- All user data (settings, watch history, subtitles, vocabulary) lives in `localStorage` and `IndexedDB`, entirely inside the browser.

> [!NOTE]
> The interface is currently **Arabic and right-to-left (RTL)**; translating it is a planned project (see [Roadmap](../../README.md#future-additions)).

---

## Why This Project Exists

Language learning from video is usually limited to a single subtitle track — or none at all. Typical frustrations:

- You cannot see the original text and its translation **together**, synchronized.
- You cannot click a word for its meaning **without leaving the player**.
- You cannot review what you learned afterwards.

DUAL_SUB addresses all three: it overlays two independently styleable and draggable subtitle tracks, turns every word on the video into a clickable dictionary entry, and feeds saved words into a spaced-repetition review system.

---

## Key Features

| Feature | Description |
|---|---|
| **Dual subtitles** | Source and translation on the video, each with its own color, size, and position; each line drags independently, with one-tap placement (bottom / middle / top). Text size follows the video's width: smaller on a phone, larger in fullscreen, unchanged at ordinary desktop sizes. |
| **Three video sources** | YouTube (via `youtube-nocookie.com`), Vimeo, or a local file played from an in-browser `Blob` URL — never uploaded anywhere. |
| **Subtitle formats** | `.srt`, `.vtt`, `.ass`/`.ssa`, and **bilingual single files** (two lines per cue, automatically split into both tracks). Files are validated and capped at 2 MB. |
| **Per-track language** | Each track's language is chosen from **18 supported languages** (Arabic, English, French, Spanish, German, Italian, Portuguese, Turkish, Persian, Urdu, Hebrew, Russian, Chinese, Japanese, Korean, Hindi, Indonesian, Dutch). An explicit pick overrides auto-detection and persists across reloads. |
| **Syncing** | Nudge each track in small steps, or use **two-point sync** to fix subtitles that drift (frame-rate mismatches). Offsets are remembered per video and per file. |
| **Reading mode** | Press `T` for a lyrics-style card list that follows the audio, with the **word being spoken highlighted** (exact timings from YouTube auto-caption VTT when available; an estimate otherwise), virtualized for videos with thousands of lines. |
| **Vocabulary** | Click any word for meaning and translation (Wiktionary + MyMemory; German adds article, plural, verb forms, and lemma), then **save it with the sentence, video, and timestamp** it came from. Saved words are **underlined on the video and in reading mode** (switch in Settings). The vocabulary list has **search, status filters, sorting, a "this video only" filter, personal notes, and undo for a removed word**. |
| **Spaced repetition** | Leitner-box review (10 min → 1 d → 3 d → 7 d → 14 d → 30 d) with fill-in-the-blank cards; export to CSV or **Anki Cloze**. Review is **keyboard-driven** (`Space` reveals, `1`/`2`/`3` grade), shows a progress bar and an end-of-session summary, can **pronounce** the word, and caps how many new words a session introduces. |
| **Study tools** | Recall mode (hide the translation until asked), shadowing mode (auto-pause per line), repeat a line 2–4×, bookmarks, text-to-speech with voice picker, playback speed up to 2×. |
| **Transcript panel** | Every line as a clickable card with synchronized highlighting and search across both languages. |
| **Watch history** | Resume where you stopped; sync offsets and subtitle files restored next visit. |
| **Backup and restore** | One JSON file containing everything (settings, history, vocabulary, learning stats). |
| **PWA** | Installable; works offline once loaded (subtitle content included; the video stream itself requires connectivity). A new version waits until you press *Update now*, and a header badge shows when the browser is offline. |
| **First-run guide** | A three-step guide on the home screen, including how to get a subtitle file; hidden once dismissed or after the first watched video, and reopenable with *دليل البدء*. |
| **Platform integration** | Keyboard shortcuts for everything, touch gestures, Picture-in-Picture, Media Session lock-screen controls, fullscreen, wake lock. |
| **Accessible by construction** | Separately designed dark/light themes (text tokens verified at WCAG AA 4.5:1 by a unit test), `prefers-reduced-motion` honored, semantic HTML, focus-trapped dialogs, full keyboard operation. |

---


## Word Lookup and German Grammar

Clicking a word opens a card combining several free, key-less sources:

- **Meaning:** Wiktionary REST API (definitions).
- **Translation:** MyMemory machine translation.
- **German grammar (Wikimedia Action API on `en.wiktionary.org`):**
  - **Nouns** — article and plural, e.g. `das Haus · die Häuser` (both variants shown when a noun has two genders).
  - **Verbs** — infinitive with principal parts, e.g. `gehen · er geht · ging · ist gegangen`.
  - **Inflected forms** — `gegangen` or `Häuser` are resolved to their lemma (`gehen`, `Haus`), which is also translated.
- Saved words keep their lemma, article, and plural and display them in the vocabulary list.

**Limits:** German grammar is currently the only language with this data; other languages get meaning + translation. Results are cached locally (200 words, 30 days) so repeated words trigger no network request, and the entire lookup can be disabled in **Settings → Privacy**. The parser degrades gracefully ("no grammar block") if Wiktionary markup changes.
