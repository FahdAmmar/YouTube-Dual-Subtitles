# DUAL_SUB — Privacy and data storage

[← Back to the README](../../README.md)

## Privacy and Data Storage

| Aspect | Details |
|---|---|
| **No backend** | No server, database, login, or analytics. Local videos and subtitle files are processed in the browser and never uploaded. |
| **One outbound feature** | Clicking a word sends *that word only* to Wiktionary and MyMemory. Disabled via **Settings → Privacy**; results are cached on-device. |
| **Content Security Policy** | Generated at build time: scripts self-only (the inline theme script is allowed by hash, not `unsafe-inline`), network only to the dictionary services, embeds only YouTube/Vimeo. The real-Chrome e2e check fails the build on any violation. |
| **Untrusted input** | Subtitle text renders through React (no raw HTML path); exports guard against spreadsheet formula injection; stored data is validated and falls back to defaults on read. |
| **Embeds** | YouTube plays via `youtube-nocookie.com`. Only `strict-origin-when-cross-origin` is used (see the deployment note above). |

Where data lives:

| Data | Storage |
|---|---|
| Settings, theme, watch history, sync offsets, vocabulary, bookmarks, learning stats | `localStorage` |
| Subtitle files saved with watch history | `IndexedDB` |
| Word lookup cache (not included in backups) | `localStorage` |
| Full backup/restore | Single JSON export file |
