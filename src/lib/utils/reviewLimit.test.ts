import { describe, it, expect } from 'vitest'
import { DEFAULT_NEW_LIMIT, NEW_LIMIT_OPTIONS, normalizeNewLimit } from './reviewLimit'

describe('normalizeNewLimit', () => {
  it('keeps every offered value, including "no limit" (null)', () => {
    for (const option of NEW_LIMIT_OPTIONS) expect(normalizeNewLimit(option)).toBe(option)
  })

  it('falls back to the default for anything else stored', () => {
    for (const bad of [undefined, 'lots', 7, -1, 1.5, Number.NaN, {}, []]) {
      expect(normalizeNewLimit(bad)).toBe(DEFAULT_NEW_LIMIT)
    }
  })
})
