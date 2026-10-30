import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { WatchHistoryList } from './WatchHistoryList'
import { STORAGE_KEYS } from '@/constants/theme.constants'

function seedHistory() {
  window.localStorage.setItem(
    STORAGE_KEYS.WATCH_HISTORY,
    JSON.stringify({
      'youtube:abc': {
        videoKey: 'youtube:abc',
        displayName: 'فيديو تجريبي',
        thumbnailUrl: null,
        lastWatchedAt: Date.now(),
        source: { type: 'youtube', videoId: 'abc' },
        subtitleFileNames: { source: null, translation: null },
      },
    }),
  )
}

function renderList() {
  return render(<WatchHistoryList onSelectYoutube={vi.fn()} onSelectVimeo={vi.fn()} onSelectLocal={vi.fn()} />)
}

describe('WatchHistoryList clear-all confirmation', () => {
  beforeEach(() => {
    window.localStorage.clear()
    seedHistory()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('needs a second, explicit tap before the history is cleared', () => {
    renderList()

    fireEvent.click(screen.getByRole('button', { name: 'مسح الكل' }))
    expect(screen.getByText('فيديو تجريبي')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'تأكيد مسح الكل' }))
    expect(screen.queryByText('فيديو تجريبي')).not.toBeInTheDocument()
  })

  it('cancels without touching the history', () => {
    renderList()

    fireEvent.click(screen.getByRole('button', { name: 'مسح الكل' }))
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }))

    expect(screen.getByRole('button', { name: 'مسح الكل' })).toBeInTheDocument()
    expect(screen.getByText('فيديو تجريبي')).toBeInTheDocument()
  })

  it('disarms by itself after a few seconds', () => {
    vi.useFakeTimers()
    renderList()

    fireEvent.click(screen.getByRole('button', { name: 'مسح الكل' }))
    expect(screen.getByRole('button', { name: 'تأكيد مسح الكل' })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(4100)
    })

    expect(screen.queryByRole('button', { name: 'تأكيد مسح الكل' })).not.toBeInTheDocument()
    expect(screen.getByText('فيديو تجريبي')).toBeInTheDocument()
  })
})
