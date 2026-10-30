import { describe, it, expect } from 'vitest'
import { DEFAULT_LAYOUT, getSubtitleFontScale, nextPlacement, normalizeLayout } from './subtitleLayout'

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

describe('getSubtitleFontScale', () => {
  it('leaves the chosen font size alone for ordinary desktop video widths', () => {
    expect(getSubtitleFontScale(640)).toBe(1)
    expect(getSubtitleFontScale(800)).toBe(1)
    expect(getSubtitleFontScale(1000)).toBe(1)
  })

  it('shrinks the text in proportion on a small video, but never below the floor', () => {
    expect(getSubtitleFontScale(480)).toBeCloseTo(0.75)
    expect(getSubtitleFontScale(360)).toBe(0.65)
    expect(getSubtitleFontScale(120)).toBe(0.65)
  })

  it('grows the text on a large video (fullscreen), up to a ceiling', () => {
    expect(getSubtitleFontScale(1200)).toBeCloseTo(1.2)
    expect(getSubtitleFontScale(1920)).toBe(1.5)
    expect(getSubtitleFontScale(5000)).toBe(1.5)
  })

  it('falls back to the chosen size when the width is unknown', () => {
    expect(getSubtitleFontScale(0)).toBe(1)
    expect(getSubtitleFontScale(-5)).toBe(1)
    expect(getSubtitleFontScale(Number.NaN)).toBe(1)
  })
})
