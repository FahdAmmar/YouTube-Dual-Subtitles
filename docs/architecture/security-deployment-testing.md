# DUAL_SUB — Privacy, security, deployment and testing

[← Architecture overview](../ARCHITECTURE.md)

## Privacy and security

| | |
| --- | --- |
| **No server** | There is no backend, database, login or analytics. Subtitle files and local videos are processed in the browser and never uploaded. |
| **One outgoing feature** | Clicking a word sends *that word only* to **Wiktionary** and **MyMemory** (for an inflected form also its lemma). It is on by default, can be switched off in *Settings → Privacy*, and results are cached on your device so repeated words send nothing. |
| **Content-Security-Policy** | Added to the production build: scripts only from the app itself (the small inline theme script is allowed by hash, not by `unsafe-inline`), network requests only to the two dictionary services, embeds only from YouTube and Vimeo. A real-Chrome test fails the build on any violation. |
| **Untrusted input everywhere** | Subtitle text is rendered through React (no raw HTML path). Exports guard against spreadsheet formulas and stray tabs/newlines. The share-URL settings are validated against strict patterns, so a crafted setting can never reach the HTML. |
| **Stored data is validated** | Reading preferences, review state, saved sentence context, learning stats and restored backups are checked when read, and settings are merged with defaults, so a bad value falls back instead of crashing. |
| **Privacy-friendly embeds** | YouTube plays through `youtube-nocookie.com`. |
| **Dependencies** | `npm audit --omit=dev`: **0 vulnerabilities**. The 9 remaining advisories are all in development tools (Vite, Vitest, Puppeteer and their dependencies), none in what ships; they were not touched by the Tailwind/ESLint upgrade, which removed the three that came from Tailwind 3 (`tailwindcss`, `postcss-nested`, `postcss-selector-parser`). |

> Only load subtitle files you have the right to use. This tool does not distribute any content.

---

## Deployment

The build is a folder of static files (`dist/`) and the project is deployed on **Vercel**; `vercel.json` holds the configuration.

### Vercel

1. Push the repository to GitHub, GitLab or Bitbucket.
2. In Vercel choose **Add New → Project** and import it. Vercel recognises the Vite project; `vercel.json` sets the install command (`npm ci`), the build command (`npm run build`), the output folder (`dist`) and the security and caching headers. Leave *Root Directory* empty.
3. Click **Deploy**. No environment variable is required.

From a terminal: `npx vercel` for a preview and `npx vercel --prod` for production. `.vercelignore` keeps that upload down to what the build needs.

| Setting | Notes |
| --- | --- |
| **Node.js** | `package.json` pins `engines.node` to `22.x`, which overrides the project setting, so builds do not jump to a newer major by themselves. |
| **`SITE_URL`** (optional) | Link previews need absolute share-image URLs. On Vercel the build derives them from the variables Vercel provides (`VERCEL_PROJECT_PRODUCTION_URL` for production, `VERCEL_URL` for previews; keep *Automatically expose System Environment Variables* on). Set `SITE_URL=https://your-domain.com` only to override that. |
| **`BASE_PATH`** | Leave it unset on Vercel: the app is served from the domain root. It exists only to serve the app below the domain root (for example `/dual-subs/`). |
| **Headers** | `frame-ancestors 'none'`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; one year `immutable` caching for `/assets/*`, 30 days for `/fonts/*`, and `no-cache` for `index.html`, `sw.js`, `registerSW.js` and the manifest so updates reach visitors. `src/lib/deploy/hostConfigs.test.ts` checks them against `vercel.json`. |
| **Routing** | The app has no client-side router, so no rewrite rules are needed. |

> Never set `Referrer-Policy: no-referrer`: YouTube embeds then refuse to play (error 153).

### Performance

Measured on a local production build in headless Chromium (cache disabled, first visit to the start screen): about 403 KB transferred in 15 requests, of which 107 KB (gzip) is the JavaScript needed for the first paint. Animation code (`LazyMotion`), the non-Latin font parts and the share image are loaded only when needed, and the service worker installs with 878 KiB instead of 1.8 MiB.

---

## Testing and quality

Three layers, each catching what the one below cannot:

| Layer | Tooling | What it is for |
| --- | --- | --- |
| **Unit** | Vitest | Pure logic: parsers, pairing, timing, scheduling, export formats, helpers |
| **Integration** | Vitest + Testing Library + jsdom | The whole app: upload, sync, reading mode, vocabulary, backup |
| **Real browser** | puppeteer-core + axe-core | Everything jsdom cannot see: layout, scrolling, colour contrast, CSP |

At the time of writing: **825 tests in 120 files** (unit + integration), all passing. The **4 real-Chrome scenarios** (dark/light × desktop/phone) are run by hand where a Chrome binary exists; they are not part of the test count above.

The real-browser check runs against the **production build** and verifies, among other things, that a short subtitle never wraps onto two lines and never sits underneath the control bar.

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run e2e
```

CI (`.github/workflows/ci.yml`) runs exactly that on every push and pull request. `npm run e2e:screens` adds home, settings and vocabulary screens to the real-Chrome checks; it is run by hand for now.
