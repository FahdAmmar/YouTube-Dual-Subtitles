# DUAL_SUB — Known limitations, roadmap and contributing

[← Architecture overview](../ARCHITECTURE.md)

## Known limitations and roadmap

**Known limitations**

- **Interface language.** The UI is Arabic and right-to-left. Translating it touches roughly 120 source files and about 400 test queries and needs a decision on layout direction for LTR languages, so it is a project of its own.
- **Word timing** is exact only for YouTube automatic captions in `.vtt`; everywhere else it is an estimate.
- **YouTube and Vimeo** always show their player (terms of service); audio-only works for local files.
- **Subtitle sourcing.** The app has no server, so it cannot fetch YouTube captions: bring your own `.srt`, `.vtt` or `.ass` files.
- **Anki export** follows the file-header format of Anki 2.1.54+ and has not been tried against a real Anki installation.
- **Contrast on tinted or translucent surfaces** (badges, cards over the video) is only checked by the real-Chrome scripts (`npm run e2e`, `npm run e2e:screens`); the unit test covers the plain theme tokens against the plain surfaces.
- **Browser floor:** Tailwind 4 needs Chrome / Edge 111+, Safari 16.4+ or Firefox 128+; an older browser shows the page unstyled.
- **React-hooks rules:** only `rules-of-hooks` and `exhaustive-deps` are enabled, as before the upgrade. The stricter rules of `eslint-plugin-react-hooks` 7 (`refs` 42 places, `set-state-in-effect` 9, `purity` 4, `incompatible-library` 1) are not, because fixing them means refactoring working code.
- **On-video text size.** The sizes in Settings apply at ordinary desktop widths (640–1000 px of video); below that the text shrinks to at most 0.65×, above it grows to at most 1.5×. The multiplier is not itself adjustable.
- **Notes** stay in the app: they are included in backups but not in the CSV or Anki export.
- **Undo** covers only the latest removed word, for 8 seconds.
- **Saved-word underline** matches the saved form and, where known (German), its dictionary form; other inflections of a saved word are not marked.
- **Updates are opt-in.** Someone who never presses *Update now* keeps the old version until every tab of the app is closed.
- **No cross-device sync.** Data stays on one device; use *Backup & restore* to move it.

**Roadmap**

- [ ] Interface translation (library vs. hand-rolled dictionary, LTR layout pass)
- [x] ESLint 10 (flat config) and Tailwind 4 upgrades
- [x] Axe checks for the home, settings and vocabulary screens (`npm run e2e:screens`)
- [x] Contrast of the part-of-speech chips and the review buttons (reported by `npm run e2e:screens`; fixed by using theme text colours and keeping the accent for borders)
- [ ] Run `e2e:screens` in CI and extend it to the upload screens
- [ ] Automated test of Anki import with a real Anki
- [ ] Lemma-aware lookup for inflected forms

---

## Contributing

Issues and pull requests are welcome.

1. Fork and create a branch.
2. Read `CLAUDE.md` and `.claude/rules/` — they describe the conventions (small functions, no new runtime dependency without a reason, no backend, every bug fix ships with a test that fails without it).
3. Make the change, then run `npm run lint && npm test && npm run build && npm run e2e`.
4. Open a pull request describing the problem and how you verified the fix.

---

## License and credits

Released under the [MIT License](../../LICENSE).

- **[YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)** and **[Vimeo Player](https://developer.vimeo.com/player)** for playback.
- **[Wiktionary](https://en.wiktionary.org)** (definitions) and **[MyMemory](https://mymemory.translated.net)** (translations) for the optional word lookup.
- **[IBM Plex](https://github.com/IBM/plex)** typefaces (Sans, Sans Arabic, Mono), used under the SIL Open Font License (see `public/fonts/LICENSES/`).
- **[Lucide](https://lucide.dev)** icons, **[TanStack Virtual](https://tanstack.com/virtual)**, **[Framer Motion](https://www.framer.com/motion/)**, **[axe-core](https://github.com/dequelabs/axe-core)** and **[Puppeteer](https://pptr.dev)**.
- The screenshots in the README show public German-learning videos from YouTube; the video content belongs to its creators.

<div align="center">
<br />
<sub>If this helps your language learning, a ⭐ on the repository is appreciated.</sub>
</div>
