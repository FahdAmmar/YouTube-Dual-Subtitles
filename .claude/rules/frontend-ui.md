---
paths:
  - "src/components/**"
  - "src/context/**"
  - "src/styles/**"
  - "src/index.css"
  - "index.html"
---

# Frontend UI Conventions

Stack: React 18, Tailwind CSS 4 (CSS-first), Framer Motion through `LazyMotion`. The interface is
Arabic and right-to-left (`<html lang="ar" dir="rtl">`); an interface translation is a planned
project, so keep user-facing text easy to find and do not scatter it through logic.

## Theming and colour

- The theme is the `@theme` / `@theme inline` block in `src/index.css`. There is no `tailwind.config.ts`.
- Each theme (`:root, [data-theme='dark']` and `[data-theme='light']`) defines RGB channel variables named
  `--rgb-*`; `@theme inline` maps them to Tailwind colours (`bg-surface`, `text-text-primary`,
  `border-border`, `text-track-a`, `bg-console/10`, ...). Never name a channel `--color-*`: that is Tailwind's namespace.
- Use the tokens, not raw hex or `rgb()` in components. The only free-form colours are the ones the user picks
  (subtitle colours) and they flow through `SubtitleSettingsContext`.
- Adding a colour token means: one `--rgb-*` in **both** theme blocks, one `--color-*` line in `@theme inline`,
  and a case in `src/__tests__/theme-contrast.test.ts` if it is used for text.
- Dark variants use the custom variant `dark:` bound to `[data-theme='dark']`, not `prefers-color-scheme`.
- In `src/index.css`, write `-webkit-backdrop-filter` before `backdrop-filter` (`css-vendor-prefixes.test.ts` enforces it).

## Components

- Join class names with `cn()` (`src/lib/utils/cn.ts`) so a caller's `h-8` beats a component's default `h-10`.
- Reuse the primitives in `src/components/ui/` (`Button`, `IconButton`, `Card`, `Select`, `Slider`, `ColorPicker`)
  before writing a new one. `ui/` stays generic: no app state, no knowledge of subtitles or videos.
- Put a component in its feature folder (`video`, `subtitles`, `settings`, `console`, `reading`, `layout`, `system`).
  One exported component per file; props typed in the same file unless shared.
- Logic does not live in components: parsing and formatting go to `src/lib/`, stateful behaviour to a `useX` hook.
- The watch screen is loaded with `lazy()` in `AppShell.tsx`; heavy or rarely used panels are loaded with `lazy()` in
  `WatchScreen.tsx` (reading view, settings, vocabulary, shortcuts). Follow that pattern for a new large panel. State
  that belongs to the watched video lives in `WatchScreen` and is dropped when the user goes back to the start screen.
- Never use `dangerouslySetInnerHTML`; subtitle text and dictionary results are untrusted.
- Every data-driven view has three states designed on purpose: loading, empty, error. Unexpected render errors are
  caught by `components/system/ErrorBoundary.tsx`.

## Motion

- Use `m.div`, `m.p`, ... never `motion.*`: `LazyMotion strict` in `App.tsx` throws on the full component and the
  full engine would return to the first download. Drag and layout animations need `domMax` instead of
  `domAnimation` (`src/lib/motion/domAnimationFeatures.ts`); add it only for a feature that needs it.
- Respect `prefers-reduced-motion` (see `src/index.css` and `ReadingView.tsx`): no essential information may live only in an animation.

## Fonts and assets

- Fonts are split by `unicode-range` in `src/styles/fonts.css`; `src/lib/deploy/fontFiles.test.ts` fails when a file
  is missing or unused. Do not add a family or weight without a measured need.
- Icons come from `lucide-react`; decorative icons are `aria-hidden`.
