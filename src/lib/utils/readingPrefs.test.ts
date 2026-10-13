import { describe, it, expect } from 'vitest'
import { DEFAULT_READING_PREFS, sanitizeReadingPrefs } from './readingPrefs'

describe('sanitizeReadingPrefs', () => {
  it('keeps valid values', () => {
    const prefs = { fontScaleIndex: 3, isSwapped: true, showTimestamps: false }
    expect(sanitizeReadingPrefs(prefs)).toEqual(prefs)
  })

  it.each([null, undefined, 'x', 42, []])('falls back to defaults for %s', (value) => {
    expect(sanitizeReadingPrefs(value)).toEqual(DEFAULT_READING_PREFS)
  })

  it('repairs each bad field on its own', () => {
    expect(sanitizeReadingPrefs({ fontScaleIndex: 99, isSwapped: 'yes', showTimestamps: false })).toEqual({
      ...DEFAULT_READING_PREFS,
      showTimestamps: false,
    })
    expect(sanitizeReadingPrefs({ fontScaleIndex: 1.5 }).fontScaleIndex).toBe(DEFAULT_READING_PREFS.fontScaleIndex)
  })
})
