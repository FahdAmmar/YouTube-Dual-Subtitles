# DUAL_SUB — Contributing, license and credits

[← Back to the README](../../README.md)

## Contributing

Issues and pull requests are welcome.

1. **Fork** the repository and create a feature branch.
2. **Read the conventions** — `CLAUDE.md` and `.claude/rules/` document the project's non-negotiables, notably:
   - No backend calls, secrets, or required external services — the app must stay fully client-side.
   - Persistent state goes through the existing `localStorage`/`IndexedDB` helpers, not ad-hoc reads/writes.
   - **Every bug fix ships with a regression test confirmed to fail without the fix.** A bug visible only on screen (layout, contrast, scrolling) needs a check in `e2e/`, not just a unit test.
3. **Make the change** and verify it:

   ```bash
   npm run typecheck && npm run lint && npm test && npm run build && npm run e2e
   ```

4. **Open a pull request** describing the problem and how you verified the fix.

---

## License

Released under the [MIT License](../../LICENSE).

The bundled IBM Plex typefaces (Sans, Sans Arabic, Mono) are used under the **SIL Open Font License** — see `public/fonts/LICENSES/`.

---

## Credits

- **Playback:** [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference), [Vimeo Player SDK](https://developer.vimeo.com/player)
- **Word lookup:** [Wiktionary](https://en.wiktionary.org) (definitions and German grammar), [MyMemory](https://mymemory.translated.net) (translations)
- **Fonts:** [IBM Plex](https://github.com/IBM/plex) typefaces under the SIL Open Font License
- **Icons:** [Lucide](https://lucide.dev)
- **Libraries:** [TanStack Virtual](https://tanstack.com/virtual), [Framer Motion](https://www.framer.com/motion/), [axe-core](https://github.com/dequelabs/axe-core), [Puppeteer](https://pptr.dev)

---

<div align="center">
<sub>If this project helps your language learning, a star on GitHub is appreciated.</sub>
</div>
