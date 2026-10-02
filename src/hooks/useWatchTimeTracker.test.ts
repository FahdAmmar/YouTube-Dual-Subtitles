import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useWatchTimeTracker } from './useWatchTimeTracker'
import { getWatchSecondsByDay, toDayKey } from '@/lib/utils/learningStatsStore'

const NOON = new Date(2026, 9, 1, 12)
const todaySeconds = () => getWatchSecondsByDay().get(toDayKey(NOON)) ?? 0

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
})
afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(document, 'hidden')
})

describe('useWatchTimeTracker', () => {
  it('records nothing while paused', () => {
    renderHook(() => useWatchTimeTracker(false))
    vi.advanceTimersByTime(60_000)
    expect(todaySeconds()).toBe(0)
  })

  it('records time while playing', () => {
    renderHook(() => useWatchTimeTracker(true))
    vi.advanceTimersByTime(10_000)
    expect(todaySeconds()).toBe(10)
  })

  it('adds the partial interval when playback pauses', () => {
    const { rerender } = renderHook(({ playing }) => useWatchTimeTracker(playing), { initialProps: { playing: true } })
    vi.advanceTimersByTime(7_000)
    rerender({ playing: false })
    expect(todaySeconds()).toBe(7)
    vi.advanceTimersByTime(30_000)
    expect(todaySeconds()).toBe(7)
  })

  it('adds the partial interval when the player goes away', () => {
    const { unmount } = renderHook(() => useWatchTimeTracker(true))
    vi.advanceTimersByTime(3_000)
    unmount()
    expect(todaySeconds()).toBe(3)
  })

  it('does not count a long gap such as a sleeping laptop', () => {
    renderHook(() => useWatchTimeTracker(true))
    vi.setSystemTime(new Date(NOON.getTime() + 3_600_000))
    vi.advanceTimersByTime(5_000)
    expect(todaySeconds()).toBe(10)
  })

  it('allows a longer gap in a background tab, where browsers throttle timers', () => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    renderHook(() => useWatchTimeTracker(true))
    // 55 s skipped plus the 5 s tick = a 60 s gap, well past the visible-tab cap of 10 s
    vi.setSystemTime(new Date(NOON.getTime() + 55_000))
    vi.advanceTimersByTime(5_000)
    expect(todaySeconds()).toBe(60)
  })
})
