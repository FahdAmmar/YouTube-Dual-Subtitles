import { describe, it, expect } from 'vitest'
import { formatBytes } from './formatBytes'

describe('formatBytes', () => {
  it('formats zero and negative values as 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 بايت')
    expect(formatBytes(-5)).toBe('0 بايت')
  })

  it('formats sub-kilobyte values in bytes', () => {
    expect(formatBytes(512)).toBe('512 بايت')
  })

  it('formats kilobyte-range values with one decimal under 10 KB', () => {
    expect(formatBytes(5 * 1024)).toBe('5.0 ك.ب')
  })

  it('formats kilobyte-range values with no decimals at or above 10 KB', () => {
    expect(formatBytes(250 * 1024)).toBe('250 ك.ب')
  })

  it('formats megabyte-range values with one decimal', () => {
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 م.ب')
  })

  it('returns 0 bytes for non-finite input', () => {
    expect(formatBytes(NaN)).toBe('0 بايت')
    expect(formatBytes(Infinity)).toBe('0 بايت')
  })
})
