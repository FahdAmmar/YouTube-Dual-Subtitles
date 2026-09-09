import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatRelativeTime } from './formatRelativeTime'

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "الآن" for timestamps less than a minute ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
    expect(formatRelativeTime(Date.now() - 30_000)).toBe('الآن')
  })

  it('formats hours ago correctly', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000
    expect(formatRelativeTime(threeHoursAgo)).toContain('3')
  })

  it('formats two days ago with the natural Arabic idiom', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-10T12:00:00Z'))
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000
    // numeric: 'auto' يُنتج الصياغة العربية الطبيعية بدل "قبل يومين" الحرفية
    expect(formatRelativeTime(twoDaysAgo)).toBe('أول أمس')
  })

  it('formats several days ago with a numeric count', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-10T12:00:00Z'))
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000
    expect(formatRelativeTime(fiveDaysAgo)).toContain('5')
  })
})
