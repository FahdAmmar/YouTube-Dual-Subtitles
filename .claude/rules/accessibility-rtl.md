---
paths:
  - "src/components/**"
  - "src/hooks/useDialogFocusTrap.ts"
  - "src/hooks/useKeyboardShortcuts.ts"
  - "src/index.css"
  - "e2e/**"
---

# Accessibility and RTL

The target is WCAG 2.x A/AA. `npm run e2e` and `npm run e2e:screens` run axe-core (`wcag2a`, `wcag2aa`,
`wcag21a`, `wcag21aa`) in real Chrome, because jsdom cannot compute colour contrast or layout.

## Contrast

- Text must reach 4.5:1 on its surface in both themes. The accent colour is derived from the subtitle colour
  (`useDynamicAccentColor`), so it can be low-contrast: never rely on `text-console` or `text-text-muted` for
  text. Use `text-text-primary` / `text-text-secondary`; keep the accent for borders, icons and fills.
- `text-console` and `text-track-b` follow user-chosen colours, so they fail contrast on some themes. The vocabulary
  chips and the review buttons use `text-text-secondary`, `text-text-primary` and `text-error`, with the accent only on
  borders; `npm run e2e:screens` is clean. Keep it that way: a new violation is yours to fix.

## Keyboard and focus

- Everything must be operable with the keyboard. Shortcuts are declared once in `KEYBOARD_SHORTCUTS`
  (`src/constants/keyboardShortcuts.ts`); that single table drives both `useKeyboardShortcuts` and the shortcuts
  panel, so add a new shortcut there (plus its handler) rather than in either consumer.
- Dialogs trap focus with `useDialogFocusTrap`, close on `Escape`, and return focus to the element that opened them.
  Do not hand-roll a second focus trap.
- The visible focus ring must never be removed without an equal replacement.
- Icon-only buttons need an accessible name (`aria-label`); decorative icons are `aria-hidden`.

## Semantics

- Use real elements: `button` for actions, `a` for navigation, headings in order, `label` for every input.
- A word inside running text that opens its meaning stays a `<span>` (a `<button>` is an atomic inline box and would
  break the bidirectional flow of the line) with `role="button"`, `tabIndex={0}` and `buttonKeyHandlers`
  (`src/lib/utils/buttonKeys.ts`: Enter on key down, Space on key up). Whatever contains such words must not itself be a
  button (axe `nested-interactive`): give it `role="presentation"` for the mouse click and put the keyboard action in a
  real button next to it (see `ReadingCard`).
- Announce dynamic changes (toasts, the offline badge) with `role="status"`, as `ConnectionBadge` and
  `PwaStatusToast` do, rather than silent DOM changes.

## Right-to-left

- The document is `dir="rtl"`. Prefer logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`,
  `text-start`, `text-end`) over `ml-*`, `mr-*`, `left-*`, `right-*`, `text-left`, `text-right`.
- Numbers around " / " inside RTL text swap places: wrap them in `dir="ltr"`.
- Subtitle lines can be in either direction regardless of the interface: `SubtitleLine` renders them with
  `dir="auto"`. Never assume the interface direction for subtitle text.
- Check new UI in both directions of content (Arabic and Latin text in the same row) and at phone width.
