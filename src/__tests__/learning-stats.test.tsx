import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import { createBackup } from '@/lib/utils/backup'
import { addWatchSeconds, getWatchSecondsByDay, toDayKey } from '@/lib/utils/learningStatsStore'

beforeEach(() => {
  window.localStorage.clear()
  installMockYouTubeApi()
})
afterEach(() => vi.useRealTimers())

async function openVideo() {
  fireEvent.change(screen.getByLabelText('رابط الفيديو'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/وضع العرض/)).toBeInTheDocument())
  // The player becomes ready a moment after the screen mounts (the watch screen is loaded on demand), and the
  // controls and shortcuts only exist once it is
  await screen.findByRole('button', { name: 'تشغيل' })
}

describe('learning stats', () => {
  it('stays out of the way on the home screen for a brand new learner', () => {
    render(<App />)
    expect(screen.queryByText('إحصاءات التعلّم')).not.toBeInTheDocument()
  })

  it('shows the learner their progress on the home screen', () => {
    addWatchSeconds(3600, new Date())
    render(<App />)
    expect(screen.getByText('إحصاءات التعلّم')).toBeInTheDocument()
    expect(screen.getByTestId('stat-streak')).toHaveTextContent('1')
    expect(screen.getByTestId('stat-week')).toHaveTextContent('1 س')
  })

  it('records time while the video is playing, and stops when it is paused', async () => {
    render(<App />)
    await openVideo()

    // Only timers and the clock are faked: the app's own async setup keeps real timers
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    fireEvent.keyDown(window, { key: ' ' })
    await act(async () => {
      vi.advanceTimersByTime(10_000)
    })
    const afterPlaying = getWatchSecondsByDay().get(toDayKey(new Date())) ?? 0
    expect(afterPlaying).toBeGreaterThanOrEqual(10)

    fireEvent.keyDown(window, { key: ' ' })
    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })
    expect(getWatchSecondsByDay().get(toDayKey(new Date()))).toBe(afterPlaying)
  })

  it('is part of the JSON backup', async () => {
    addWatchSeconds(100, new Date())
    const backup = await createBackup()
    expect(backup.local[STORAGE_KEYS.LEARNING_STATS]).toContain(toDayKey(new Date()))
  })
})
