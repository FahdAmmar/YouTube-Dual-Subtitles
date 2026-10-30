# DUAL_SUB — Building and deployment

[← Back to the README](../../README.md)

## Building for Production

```bash
npm run build
```

The output is a **fully static `dist/` folder** — the build also type-checks, generates the PWA service worker and manifest, hashes inline scripts into the CSP, and (when `SITE_URL`/`BASE_PATH` resolve to a URL) absolutizes share-image URLs. Any static file host can serve it.

---

## Deployment

This project is deployed on **Vercel**. `vercel.json` (auto-detected) holds every setting and no environment
variable is required.

### Headers and caching

`vercel.json` is the single place where response headers are defined.

- `frame-ancestors 'none'` has to be a real header (browsers ignore it inside a `<meta>` tag). The rest of the
  Content-Security-Policy is a `<meta>` tag that `vite.config.ts` adds at build time from `src/lib/csp/buildCsp.ts`.
- `Referrer-Policy: strict-origin-when-cross-origin` must keep sending the origin: YouTube embeds refuse to play
  without a referrer (error 153). Never set `no-referrer`.
- `Permissions-Policy` leaves fullscreen, autoplay and picture-in-picture alone because embedded players need them.
- Hashed build output (`/assets/*`) is cached for a year, `/fonts/*` for 30 days, and `sw.js`, `registerSW.js`,
  `manifest.webmanifest` and `index.html` are never cached, so every visitor receives updates.

`src/lib/deploy/hostConfigs.test.ts` checks these rules against `vercel.json`.

### Deploying to Vercel

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. In the [Vercel dashboard](https://vercel.com/new), choose **Add New → Project** and import the repository. Leave **Root Directory** empty.
3. Click **Deploy**. Vercel reads all settings from `vercel.json`:
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Security and caching headers (`frame-ancestors`, `X-Frame-Options`, `nosniff`, `Permissions-Policy`; one-year `immutable` caching for `/assets/*`, 30 days for `/fonts/*`, `no-cache` for `index.html`, `sw.js`, `registerSW.js`, and the manifest so updates always reach visitors).

4. Alternatively, from a terminal already authenticated with Vercel:

   ```bash
   npx vercel          # preview deployment
   npx vercel --prod   # production deployment
   ```

   `.vercelignore` keeps the upload limited to what the build needs.

Notes for Vercel:

- **Node version** — `package.json` pins `engines.node` to `^22.13.0`, which overrides the Vercel project setting so builds do not jump to a newer major.
- **`SITE_URL`** — unnecessary in practice: it is derived from the system variables Vercel exposes to the build (keep *Automatically expose System Environment Variables* on). Set it only to override.
- **`BASE_PATH`** — leave unset; the app is served from the domain root.
- **Routing** — the app has no client-side router, so no rewrite rules are needed.
