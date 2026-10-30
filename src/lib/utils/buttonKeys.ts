import type { KeyboardEvent } from 'react'

/**
 * Keyboard support for an element that has `role="button"` but is not a `<button>` (an inline word that must stay
 * a `<span>` so right-to-left text keeps flowing as one run). It follows the native button: Enter acts on key down,
 * Space on key up, and Space's key down is cancelled so the page does not scroll.
 */
export function buttonKeyHandlers(activate: () => void) {
  return {
    onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        event.preventDefault()
        activate()
      } else if (event.key === ' ') {
        event.preventDefault()
      }
    },
    onKeyUp(event: KeyboardEvent) {
      if (event.key === ' ') {
        event.preventDefault()
        activate()
      }
    },
  }
}
