---
paths:
  - "package.json"
  - "eslint.config.js"
  - "vite.config.ts"
  - "vitest.config.ts"
  - "tsconfig*.json"
  - ".github/**"
  - "vercel.json"
  - "src/lib/csp/**"
  - "src/lib/deploy/**"
---

# Tooling, Build and Deployment

- Runtime: Node `^22.13.0` (`engines`, `.nvmrc` = 22), npm >= 10. Install with `npm ci`; the lockfile is committed
  and is only changed by npm commands.
- Scripts that exist: `dev`, `build` (type-checks first), `budget`, `typecheck`, `preview`, `lint`, `lint:strict`, `test`,
  `test:watch`, `e2e`, `e2e:screens`. Check `package.json` before assuming another one exists; a missing script is not
  a passing check.
- CI (`.github/workflows/ci.yml`) runs `npm ci`, `typecheck`, `lint`, `lint:strict`, `test`, `build`, `budget`, `e2e` in
  that order on Node 22. A change is only done when the same sequence passes locally.
- Lint is ESLint 10 with a flat config (`eslint.config.js`, `defineConfig`), run with `--max-warnings 0`, so a
  warning fails the gate. Only `rules-of-hooks` (error) and `exhaustive-deps` (warn) of `eslint-plugin-react-hooks` 7 are
  enabled there. The stricter rules (`refs`, `set-state-in-effect`, `purity`, `incompatible-library`) run through
  `npm run lint:strict` (`eslint.strict.config.js`) as a ratchet: the count per rule may not exceed
  `scripts/strict-lint-baseline.json`. Fixing findings lowers the baseline (`npm run lint:strict -- --write`); never
  raise it to make a change pass.
- `npm run budget` (`scripts/check-bundle-budget.mjs`) fails when the files `dist/index.html` loads, or a lazy chunk,
  exceed their gzip budgets. It needs a fresh `dist/` from `npm run build`.
- `eslint-plugin-jsx-a11y` is not installed: its latest release (6.10.2) declares ESLint up to 9 and `npm install`
  fails with ERESOLVE on ESLint 10. Do not force it with `--legacy-peer-deps`; accessibility is covered by the e2e axe
  checks and by structure tests instead.
- Never silence a rule or loosen `tsconfig` to get green. Fix the code, or discuss the rule change on its own.
- Deployment settings (`BASE_PATH`, `SITE_URL`) are read at build time; see `docs/guide/deployment.md`.
- The Content-Security-Policy is built in `src/lib/csp/buildCsp.ts` and injected as a `<meta>` tag by `vite.config.ts`.
  Every allowed host is one the app really contacts (YouTube, Vimeo, Wiktionary, MyMemory, thumbnail hosts). Adding a
  network destination means updating `buildCsp.ts`, the host file `vercel.json`
  and `src/lib/deploy/hostConfigs.test.ts` together, and it conflicts with the "runs entirely client-side" promise,
  so it needs the maintainer's explicit approval.
- Never set `Referrer-Policy: no-referrer`: YouTube embeds then refuse to play (error 153).
- Dependencies: read the release notes before a major upgrade; do not run `npm audit fix --force`; report `npm audit`
  findings instead of applying breaking fixes automatically. Verify a version on the npm registry before stating it.
