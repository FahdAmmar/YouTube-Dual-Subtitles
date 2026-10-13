import { describe, it, expect } from 'vitest'
import { formatClock } from './formatClock'

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [9.9, '0:09'],
    [75, '1:15'],
    [3725, '1:02:05'],
    [-5, '0:00'],
    [Number.NaN, '0:00'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatClock(input)).toBe(expected)
  })
})
