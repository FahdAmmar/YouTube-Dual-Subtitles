# DUAL_SUB — Getting started

[← Back to the README](../../README.md)

## System Requirements

| Requirement | Version / Details |
|---|---|
| **Node.js** | `22.13` or newer 22.x (required by Vite 7, ESLint 10 and Tailwind 4) — set in `package.json` `engines` and `.nvmrc` |
| **npm** | `>= 10` |
| **OS** | Any (Windows, macOS, Linux) |
| **Browser** | Chrome / Edge 111+, Safari 16.4+, Firefox 128+ (the floor of Tailwind CSS 4); older browsers get an unstyled page |
| **Chrome** | Required only for `npm run e2e` (path set via `CHROME_PATH`) |

No database, API keys, or external services are required at any point.

---

## Installation and Setup

```bash
# 1. Clone the repository (replace the URL with the actual remote if you forked it)
git clone https://github.com/<username>/youtube-dual-subtitles.git
cd youtube-dual-subtitles

# 2. Install dependencies (uses package-lock.json for reproducibility)
npm ci

# 3. Start the development server
npm run dev
```

The app opens at **http://localhost:5173**.

---

## Configuration and Environment Variables

The application requires **no configuration** to run — there are no secrets or required services. The following variables are **optional** build-time or test-time overrides:

| Variable | Used by | Description |
|---|---|---|
| `BASE_PATH` | Build (`vite.config.ts`) | Serves the app below the domain root, e.g. `/dual-subs/`. Leave unset on Vercel, which serves it from the domain root. Affects Vite `base`, the PWA `start_url`/`scope`, and all asset paths. |
| `SITE_URL` | Build (`vite.config.ts`) | Absolute origin for link-preview (og/twitter) images and canonical URLs. It is derived on Vercel (`VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`); set it only to override, e.g. `https://your-domain.com`. |
| `CHROME_PATH` | `npm run e2e` | Path to a Chrome/Chromium binary. Defaults to `/usr/bin/google-chrome`; on Windows, set it explicitly, e.g. `set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"`. |
| `E2E_PORT` | `npm run e2e` | Preview server port (default `4173`). |
| `E2E_HEADLESS` | `npm run e2e` | Set to `shell` when using a `chrome-headless-shell` binary. |
| `CHROME_ARGS` | `npm run e2e` | Extra Chrome arguments (default `--no-sandbox --disable-gpu`). |

> [!IMPORTANT]
> When editing host deployment headers, never set `Referrer-Policy: no-referrer` — YouTube embeds then refuse to play (error 153). The shipped configuration uses `strict-origin-when-cross-origin` for this reason.

---

## Running Locally

```bash
npm run dev
```

- Hot-reload dev server on **http://localhost:5173**.
- Works with no internet connection for local videos; online connectivity is only needed for YouTube/Vimeo embeds and the optional per-word dictionary lookup.

To try a production build locally:

```bash
npm run build
npm run preview
```

---

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server with hot module replacement (`:5173`) |
| `npm run build` | Type-check, then produce the production build in `dist/` |
| `npm run budget` | After a build: fail if the first-page JavaScript/CSS or a lazy chunk exceeds its gzip budget |
| `npm run preview` | Serve the production build locally (`:4173`) |
| `npm run typecheck` | `tsc --noEmit` for the app and for the Vite/Node config |
| `npm run lint` | ESLint with a zero-warning policy |
| `npm run lint:strict` | Stricter react-hooks rules, checked against a recorded baseline so the count cannot grow |
| `npm test` | Run the full unit + integration test suite once |
| `npm run test:watch` | Run tests in watch mode during development |
| `npm run e2e` | Real-Chrome accessibility (axe), CSP, and layout checks against a production build |
| `npm run e2e:screens` | Real-Chrome axe checks of the home screen, settings, and vocabulary (list and review); port `4174` by default. Not part of the CI gate yet. |

The canonical **quality gate** (identical to CI, `.github/workflows/ci.yml`):

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run e2e
```
