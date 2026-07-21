import { describe, it, expect } from 'vitest'
import { splitBilingualCues, splitCueText } from './splitBilingualCues'
import type { SubtitleCue } from '@/types/subtitle.types'

function cue(start: number, end: number, text: string): SubtitleCue {
  return { start, end, text }
}

describe('splitCueText', () => {
  it('splits a two-line bilingual cue by direction (RTL→source, LTR→translation)', () => {
    const result = splitCueText('مرحباً بكم\nWelcome')
    expect(result.sourceText).toBe('مرحباً بكم')
    expect(result.translationText).toBe('Welcome')
  })

  it('keeps order-independent split for translation-first lines', () => {
    const result = splitCueText('Welcome\nمرحباً بكم')
    expect(result.sourceText).toBe('مرحباً بكم')
    expect(result.translationText).toBe('Welcome')
  })

  it('groups consecutive same-direction lines together', () => {
    const result = splitCueText('مرحباً بكم\nفي هذا الفيديو\nWelcome everyone')
    expect(result.sourceText).toBe('مرحباً بكم\nفي هذا الفيديو')
    expect(result.translationText).toBe('Welcome everyone')
  })

  it('falls back to positional split when both lines have the same direction', () => {
    const result = splitCueText('Hello world\nBonjour le monde')
    expect(result.sourceText).toBe('Hello world')
    expect(result.translationText).toBe('Bonjour le monde')
  })

  it('assigns a single RTL line to source and leaves translation null', () => {
    const result = splitCueText('مرحباً')
    expect(result.sourceText).toBe('مرحباً')
    expect(result.translationText).toBeNull()
  })

  it('assigns a single LTR line to translation and leaves source null', () => {
    const result = splitCueText('Hello')
    expect(result.sourceText).toBeNull()
    expect(result.translationText).toBe('Hello')
  })

  it('returns null for both when the text is empty', () => {
    const result = splitCueText('  \n  ')
    expect(result.sourceText).toBeNull()
    expect(result.translationText).toBeNull()
  })
})

describe('splitBilingualCues', () => {
  it('splits a bilingual cue list into two tracks with identical timing', () => {
    const cues = [
      cue(1, 4, 'مرحباً\nHello'),
      cue(5, 8, 'وداعاً\nGoodbye'),
    ]

    const { sourceCues, translationCues } = splitBilingualCues(cues)

    expect(sourceCues).toHaveLength(2)
    expect(translationCues).toHaveLength(2)

    expect(sourceCues[0]).toEqual({ start: 1, end: 4, text: 'مرحباً' })
    expect(sourceCues[1]).toEqual({ start: 5, end: 8, text: 'وداعاً' })

    expect(translationCues[0]).toEqual({ start: 1, end: 4, text: 'Hello' })
    expect(translationCues[1]).toEqual({ start: 5, end: 8, text: 'Goodbye' })
  })

  it('returns empty arrays for an empty input', () => {
    const { sourceCues, translationCues } = splitBilingualCues([])
    expect(sourceCues).toEqual([])
    expect(translationCues).toEqual([])
  })

  it('handles a single-language file by routing all cues to the matching track', () => {
    const cues = [cue(1, 4, 'مرحباً'), cue(5, 8, 'وداعاً')]
    const { sourceCues, translationCues } = splitBilingualCues(cues)

    expect(sourceCues).toHaveLength(2)
    expect(translationCues).toHaveLength(0)
  })

  it('does not mutate the input cues', () => {
    const cues = [cue(1, 4, 'مرحباً\nHello')]
    const originalText = cues[0]!.text
    splitBilingualCues(cues)
    expect(cues[0]!.text).toBe(originalText)
  })
})
