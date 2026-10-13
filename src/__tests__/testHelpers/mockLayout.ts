import { vi } from 'vitest'

/**
 * jsdom does no layout, so every element is 0x0 and the virtualized reading list would
 * render nothing. This gives elements a screen-sized box; call the returned function to undo it.
 */
export function mockElementSize(width = 600, height = 800): () => void {
  const spies = [
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(width),
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(height),
  ]
  return () => spies.forEach((spy) => spy.mockRestore())
}
