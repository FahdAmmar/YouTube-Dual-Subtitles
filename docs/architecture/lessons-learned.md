# DUAL_SUB — Lessons learned

[← Architecture overview](../ARCHITECTURE.md)

## Lessons learned

Notes from building and hardening this project. Most of them cost something to learn.

**1. Measure before you optimise — then keep the number.**
Reading mode had no limit on video length, so it was measured before anything was changed: 3,000 lines took ~4 s to open and created ~108,000 DOM nodes, growing linearly with the length of the video. The cost was creating the nodes, so only rendering fewer of them could fix it. Virtualizing the list brought it to ~150 ms and ~870 nodes, flat; memoizing harder would only have shaved a constant factor.

**2. jsdom cannot see the bugs users see.**
Every one of these passed hundreds of unit tests and was found only in a real browser: the list opened scrolled to the top instead of the current line (a "reset scroll when the search changes" effect also ran on first render); the burned-in subtitle always wrapped its last word onto a second line (a percentage `max-width` on a box that is only as wide as its longest line, so that line must always be narrower than itself); subtitles were painted *under* the always-visible control bar; the elapsed/total time showed reversed in right-to-left pages; and upcoming words in the light theme had a 2.65:1 contrast. Layout, scrolling, bidirectional text and colour need a real engine, so those checks now live in `e2e/`.

**3. A test that cannot fail proves nothing.**
Before trusting a regression test, break the code on purpose and watch it fail. One of those tests *passed with the bug put back*: a newer mechanism silently repaired the damage after it happened, so the test only saw the repaired state. It was rewritten to count the offending calls instead of inspecting the final state.

**4. Re-check your own claims.**
An earlier note said fill-in-the-blank cards would fail for inflected words (*läuft* vs *laufen*). Reading what is actually saved showed the opposite: the word is stored exactly as clicked in the sentence, so the blank always works. It is now locked in by a test through the real click-and-save path instead of an assumption.

**5. Platform rules are product requirements.**
YouTube's terms forbid playing a video's audio without showing the player, so "audio only" is offered for local files only, and in YouTube/Vimeo reading mode the video stays visible (large, beside the text). Design around the rule early; retrofitting it later changes the whole layout.

**6. Estimate honestly, and prefer real data when it exists.**
Subtitle files have no per-word timing, so the highlight is an estimate from word length. When a file *does* carry real timings (YouTube auto-captions as VTT), they are used — but only if they match the displayed words exactly. A confidently wrong highlight is worse than an approximate one.

**7. Accessibility lives in the design system, not in a checklist.**
The accent colour can be *derived from the user's subtitle colour* (an opt-in setting, off by default, so the interface keeps a fixed accent unless the learner asks otherwise), so it can never be guaranteed readable as text. The fix was a rule (accent for borders and fills, never for text) plus per-theme colour adjustment, not a one-off tweak. The first fix also changed *how progress is shown* — brightening what was read instead of dimming what is upcoming — because dimming cannot meet contrast in a light theme at any opacity.

**8. Right-to-left is more than `dir="rtl"`.**
Logical CSS properties (`start`/`end`) and a mirrored layout are the easy half. The traps are numbers: inside Arabic text, `0:15 / 0:30` renders as `0:30 / 0:15` unless forced left-to-right, and native sliders reverse direction. Test the strings, not just the layout.

**9. Treat everything stored as untrusted.**
`localStorage`, IndexedDB and restored backups can hold anything: older formats, hand edits, truncated JSON. Each reader validates and falls back, so a bad value shows up as "no data", never as a crash on start.

**10. Security is cheap when it is a default and expensive when it is a retrofit.**
The CSP has no `unsafe-inline` for scripts (the one inline script is allowed by hash and the hash is computed at build time); exports neutralise formula injection. The e2e run turns any future CSP violation into a failed build.

**11. Deployment is part of the code.**
Four small facts caused most of the work: a manifest with absolute `/` paths breaks under `/repo/`; a cached `sw.js` delays every update; `frame-ancestors` only works as a header; and `no-referrer` silently breaks YouTube embeds. Each now has a configuration, a test, and a comment explaining why.

**12. Small, verified steps beat big rewrites.**
Every change here was the smallest one that fixed the cause, tested first when possible, and run against the whole suite. A full interface translation was left out on purpose: it was counted (about 120 files and 400 test queries) and deserves its own decision rather than a rushed one. The ESLint and Tailwind upgrades were done afterwards as a separate piece of work: see [Tooling upgrade](#tooling-upgrade-eslint-10-tailwind-4).

**13. A test that passes on your machine can hide a race.**
`sync-offset-persistence` passed on the machine that wrote it and failed, every run, on a faster one. It was not flakiness: reopening a video restores its subtitle files from IndexedDB at the same moment a person can upload them, the restore re-uploaded a file after the person's own upload had landed, and every load resets the saved sync offset. The same defect hit someone who only reopened a video (a second, duplicate restore wiped the offset the first had restored). It was found by forcing both orders with explicit delays (`auto-restore-race.test.tsx`), not by rerunning the test; a first guess ("the machine is overloaded") was wrong and would have hidden it. When a test fails only on faster hardware, suspect ordering before load.

---

### Tooling upgrade (ESLint 10, Tailwind 4)

**Versions.** ESLint 10.13 with `typescript-eslint` 8.72 and a flat config (`eslint.config.js`, replacing `.eslintrc.json`); Tailwind CSS 4.3 through `@tailwindcss/vite` (replacing `tailwind.config.ts`, `postcss.config.js`, `postcss` and `autoprefixer`). ESLint 10 rather than 9 because ESLint 9 reached end of life on 2026-08-06; the flat config is the same for both. Node 22.13 or newer is now required (Vite 7, ESLint 10 and Tailwind 4 all ask for it).

**ESLint.** The rules are exactly the former ones (`rules-of-hooks`, `exhaustive-deps`, `only-export-components`, unused variables, the `eslint:recommended` and TypeScript sets), and only `.ts`/`.tsx` files are linted, as before. A deliberately bad file confirmed that each family of problems is still reported. The stricter React-hooks rules of version 7 were left off: see the roadmap.

**Tailwind.**
- The theme moved into `src/index.css` (`@theme`). The colour channels were renamed from `--color-*` to `--rgb-*`: `--color-*` is Tailwind 4's own namespace, and the official upgrade tool, run on a scratch copy, produced `--color-bg: rgb(var(--color-bg))`, a variable that points at itself. `@theme inline` maps each Tailwind colour to `rgb(var(--rgb-…))`, so a theme switch or the live accent colour still needs no rebuild.
- `@source` lists `index.html` and `src/**/*.{ts,tsx}` (what `content` was), so Tailwind does not scan the docs and scripts.
- The class renames came from the upgrade tool and were reviewed one by one (`outline-none` → `outline-hidden`, `backdrop-blur-sm` → `backdrop-blur-xs`, `bg-gradient-to-*` → `bg-linear-to-*`, logical `start-*`/`end-*` → `inset-s-*`/`inset-e-*`, arbitrary values to named ones). `rounded-sm` was correctly left alone: this project redefines it as 8 px.

**How it was checked.** The same 8 screens (home with the guide, local-file tab, player, settings, vocabulary list, review question and answer, reading mode) were captured in dark and light, at 1280 and 390 px, before and after (32 screenshots), in headless Chromium, and compared pixel by pixel; the geometry and computed styles of every element were compared in nine states at both widths; `npm run e2e` and `npm run e2e:screens` were run on both builds. Screenshots alone would have missed several of the problems below.

| What the comparison found | Cause | Fix |
|---|---|---|
| Icon buttons 40 px instead of 32 px, and a button meant to be hidden on phones visible | Components carry two conflicting classes (`h-10` + `h-8`, `inline-flex` + `hidden`); Tailwind 3 happened to emit the caller's last, Tailwind 4 does not | `cn()` now merges with `tailwind-merge`, taught the project's shadow and radius names (`cn.test.ts`) |
| The header's frosted glass gone in Chrome and Firefox | Lightning CSS, which Tailwind 4 uses, merges `backdrop-filter` followed by `-webkit-backdrop-filter` into the prefixed one only | Prefixed line written first; `css-vendor-prefixes.test.ts` and an `e2e:screens` assertion guard it |
| Hero heading 45 px tall instead of 40 px | `leading-tight` now beats the line height of `sm:text-4xl` | `sm:leading-10` |
| Small chips and interval labels 6 px shorter | A `text-[10px]` child no longer inherits the parent's absolute line height | `leading-5` on those three elements |
| Pointer cursor, placeholder colour and `<option>` spacing changed | Tailwind 4 preflight | Three base rules in `index.css`; `red-500` keeps its Tailwind 3 value |

**Result.** No element changed size in any captured state; the only computed property that still differs is `transform` (Tailwind 4 uses the separate `translate` and `rotate` properties, with the same placement). Most screenshots differ by at most 2 to 8 out of 255 in a colour channel (gradients and alpha mixing now happen in OKLab); the player screens differ in a few hundred pixels around animated subtitle text. The real-Chrome accessibility results are identical before and after. The cost is about 8.8 KB gzip of first-paint script (`tailwind-merge`) and 2.4 KB gzip of stylesheet.

**Not verified.** Real touch devices (Tailwind 4 applies `hover:` only where the pointer can hover, so hover styles no longer stick after a tap), Safari and Firefox rendering (only Chromium was available), and the on-hover states of the reading cards.
