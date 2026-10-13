import { describe, it, expect } from 'vitest'
import { formatSliceText, formatTranscriptText } from './formatTranscript'
import type { PairedSlice } from './pairCues'

const make = (sourceText: string | null, translationText: string | null): PairedSlice => ({
  id: 'x',
  originalIndex: 0,
  start: 0,
  end: 1,
  sourceText,
  translationText,
})

describe('formatSliceText', () => {
  it('puts both languages on consecutive lines', () => {
    expect(formatSliceText(make('مرحباً', 'Hello'), 'both')).toBe('مرحباً\nHello')
  })

  it('returns only the requested language', () => {
    expect(formatSliceText(make('مرحباً', 'Hello'), 'source')).toBe('مرحباً')
    expect(formatSliceText(make('مرحباً', 'Hello'), 'translation')).toBe('Hello')
  })

  it('skips a missing side without leaving a blank line', () => {
    expect(formatSliceText(make(null, 'Hello'), 'both')).toBe('Hello')
  })
})

describe('formatTranscriptText', () => {
  const slices = [make('أ', 'A'), make(null, null), make('ب', 'B')]

  it('separates bilingual pairs with a blank line and drops empty slices', () => {
    expect(formatTranscriptText(slices, 'both')).toBe('أ\nA\n\nب\nB')
  })

  it('uses single line breaks for one language', () => {
    expect(formatTranscriptText(slices, 'translation')).toBe('A\nB')
  })

  it('returns an empty string when there is nothing to copy', () => {
    expect(formatTranscriptText([], 'both')).toBe('')
  })
})
