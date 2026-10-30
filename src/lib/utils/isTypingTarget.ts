/**
 * Whether a key event comes from somewhere text is typed (text field, text area, drop-down list, editable
 * element). Single-key shortcuts must leave those alone, or typing a letter would also trigger them.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}
