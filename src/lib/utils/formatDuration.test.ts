import { describe, it, expect } from 'vitest'
import { formatDuration } from './formatDuration'

describe('formatDuration', () => {
  it.each([
    [0, '0 د'],
    [30, 'أقل من دقيقة'],
    [60, '1 د'],
    [119, '1 د'],
    [3600, '1 س'],
    [4500, '1 س 15 د'],
    [36000, '10 س'],
  ])('formats %s seconds as "%s"', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected)
  })
})
