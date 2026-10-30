import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import type { KeyboardShortcutHandlers } from '@/constants/keyboardShortcuts'

function makeHandlers(): KeyboardShortcutHandlers {
  return {
    onTogglePlayPause: vi.fn(),
    onSpeedUp: vi.fn(),
    onSlowDown: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onResetSpeed: vi.fn(),
    onPrevScene: vi.fn(),
    onNextScene: vi.fn(),
    onVolumeUp: vi.fn(),
    onVolumeDown: vi.fn(),
    onRestartScene: vi.fn(),
    onRepeatScene: vi.fn(),
    onShowHelp: vi.fn(),
    onFocusSearch: vi.fn(),
    onToggleShadowing: vi.fn(),
    onToggleTranslationReveal: vi.fn(),
    onToggleBookmark: vi.fn(),
  }
}

function Harness({ handlers, withModal }: { handlers: KeyboardShortcutHandlers; withModal: boolean }) {
  useKeyboardShortcuts(true, handlers)
  return withModal ? <div role="dialog" aria-modal="true" aria-label="لوحة" /> : null
}

describe('video shortcuts and modal panels', () => {
  it('leaves the keyboard to an open modal panel, so a review key never also controls the video', () => {
    const handlers = makeHandlers()
    render(<Harness handlers={handlers} withModal />)

    fireEvent.keyDown(document.body, { key: ' ' })
    fireEvent.keyDown(document.body, { key: '1' })
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })

    expect(handlers.onTogglePlayPause).not.toHaveBeenCalled()
    expect(handlers.onRepeatScene).not.toHaveBeenCalled()
    expect(handlers.onPrevScene).not.toHaveBeenCalled()
  })

  it('works as before once the panel is closed', () => {
    const handlers = makeHandlers()
    const { rerender } = render(<Harness handlers={handlers} withModal />)
    fireEvent.keyDown(document.body, { key: ' ' })
    expect(handlers.onTogglePlayPause).not.toHaveBeenCalled()

    rerender(<Harness handlers={handlers} withModal={false} />)
    fireEvent.keyDown(document.body, { key: ' ' })
    expect(handlers.onTogglePlayPause).toHaveBeenCalledTimes(1)
  })
})
