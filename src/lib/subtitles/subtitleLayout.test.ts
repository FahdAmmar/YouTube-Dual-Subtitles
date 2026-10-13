import { describe, it, expect } from 'vitest'
import { DEFAULT_LAYOUT, nextPlacement, normalizeLayout } from './subtitleLayout'

describe('nextPlacement', () => {
  it('cycles bottom → middle → top → bottom', () => {
    expect(nextPlacement('bottom')).toBe('middle')
    expect(nextPlacement('middle')).toBe('top')
    expect(nextPlacement('top')).toBe('bottom')
  })
})

describe('normalizeLayout', () => {
  it('returns the default for missing or non-object input', () => {
    expect(normalizeLayout(null)).toEqual(DEFAULT_LAYOUT)
    expect(normalizeLayout('oops')).toEqual(DEFAULT_LAYOUT)
    expect(normalizeLayout(undefined)).toEqual(DEFAULT_LAYOUT)
  })

  it('keeps a valid stored layout', () => {
    const stored = {
      placement: 'top',
      source: { xPercent: 5, yPercent: -2 },
      translation: { xPercent: -10, yPercent: 3 },
    }
    expect(normalizeLayout(stored)).toEqual(stored)
  })

  it('falls back per field when storage holds bad data', () => {
    const result = normalizeLayout({
      placement: 'sideways',
      source: { xPercent: 'a', yPercent: 1 },
      translation: { xPercent: 400, yPercent: Number.NaN },
    })
    expect(result).toEqual(DEFAULT_LAYOUT)
  })

  it('ignores the legacy single-bubble shape', () => {
    expect(normalizeLayout({ xPercent: 10, yPercent: 10 })).toEqual(DEFAULT_LAYOUT)
  })
})
