import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import {
  toDayKey,
  addWatchSeconds,
  getWatchSecondsByDay,
  computeStreak,
  getLastDays,
  MAX_TRACKED_DAYS,
  MIN_STREAK_SECONDS,
} from './learningStatsStore'

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.restoreAllMocks())

// Local noon, so no test can straddle midnight or a DST shift
const day = (month: number, date: number) => new Date(2026, month - 1, date, 12)
const TODAY = day(10, 1)

function watch(date: Date, seconds = MIN_STREAK_SECONDS) {
  addWatchSeconds(seconds, date)
}

describe('toDayKey', () => {
  it('formats the local calendar day as YYYY-MM-DD', () => {
    expect(toDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(toDayKey(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31')
  })
})

describe('addWatchSeconds', () => {
  it('accumulates seconds within a day and keeps days apart', () => {
    addWatchSeconds(30, day(10, 1))
    addWatchSeconds(45, day(10, 1))
    addWatchSeconds(10, day(10, 2))
    const byDay = getWatchSecondsByDay()
    expect(byDay.get('2026-10-01')).toBe(75)
    expect(byDay.get('2026-10-02')).toBe(10)
  })

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])('ignores %s seconds', (seconds) => {
    addWatchSeconds(seconds, TODAY)
    expect(getWatchSecondsByDay().size).toBe(0)
  })

  it('never records more than 24 hours for one day', () => {
    addWatchSeconds(80000, TODAY)
    addWatchSeconds(80000, TODAY)
    expect(getWatchSecondsByDay().get('2026-10-01')).toBe(86400)
  })

  it('keeps only the most recent days once the limit is exceeded', () => {
    const start = new Date(2024, 0, 1, 12)
    for (let i = 0; i <= MAX_TRACKED_DAYS; i++) {
      addWatchSeconds(1, new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12))
    }
    const byDay = getWatchSecondsByDay()
    expect(byDay.size).toBe(MAX_TRACKED_DAYS)
    expect(byDay.has('2024-01-01')).toBe(false)
  })

  it('does not throw when storage rejects the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(() => addWatchSeconds(10, TODAY)).not.toThrow()
  })
})

describe('getWatchSecondsByDay', () => {
  it.each([
    ['invalid JSON', '{nope'],
    ['an array', '[1]'],
    ['malformed day keys', '{"today": 50, "2026-1-1": 50}'],
    ['non-numeric values', '{"2026-10-01": "lots"}'],
    ['negative values', '{"2026-10-01": -5}'],
  ])('treats %s in storage as no data', (_label, raw) => {
    window.localStorage.setItem(STORAGE_KEYS.LEARNING_STATS, raw)
    expect(getWatchSecondsByDay().size).toBe(0)
  })

  it('keeps valid days and drops only the bad ones', () => {
    window.localStorage.setItem(STORAGE_KEYS.LEARNING_STATS, '{"2026-10-01": 50, "junk": 9}')
    expect([...getWatchSecondsByDay()]).toEqual([['2026-10-01', 50]])
  })
})

describe('computeStreak', () => {
  it('is zero with no data', () => {
    expect(computeStreak(getWatchSecondsByDay(), TODAY)).toBe(0)
  })

  it('counts consecutive qualifying days ending today', () => {
    watch(day(10, 1))
    watch(day(9, 30))
    watch(day(9, 29))
    expect(computeStreak(getWatchSecondsByDay(), TODAY)).toBe(3)
  })

  it('keeps the streak alive today until the day is over', () => {
    watch(day(9, 30))
    watch(day(9, 29))
    expect(computeStreak(getWatchSecondsByDay(), TODAY)).toBe(2)
  })

  it('does not count a day below the minimum watch time', () => {
    watch(day(10, 1), MIN_STREAK_SECONDS - 1)
    watch(day(9, 30))
    expect(computeStreak(getWatchSecondsByDay(), TODAY)).toBe(1)
  })

  it('stops at the first missed day', () => {
    watch(day(10, 1))
    watch(day(9, 29))
    expect(computeStreak(getWatchSecondsByDay(), TODAY)).toBe(1)
  })

  it('is broken once a whole day has passed without watching', () => {
    watch(day(9, 29))
    expect(computeStreak(getWatchSecondsByDay(), TODAY)).toBe(0)
  })
})

describe('getLastDays', () => {
  it('returns the requested days oldest to newest, zero-filled', () => {
    watch(day(10, 1), 120)
    watch(day(9, 29), 300)
    const days = getLastDays(getWatchSecondsByDay(), TODAY, 4)
    expect(days.map((entry) => entry.dayKey)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'])
    expect(days.map((entry) => entry.seconds)).toEqual([0, 300, 0, 120])
  })
})
