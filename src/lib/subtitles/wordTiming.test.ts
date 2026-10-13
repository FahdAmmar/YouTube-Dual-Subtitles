import { describe, it, expect } from 'vitest'
import { buildWordTimeline, getActiveWordIndex, getSpeechProgress } from './wordTiming'

describe('buildWordTimeline', () => {
  it('keeps whitespace tokens so the original text can be rebuilt exactly', () => {
    const { tokens } = buildWordTimeline('Hello  big world')
    expect(tokens.map((token) => token.text).join('')).toBe('Hello  big world')
  })

  it('numbers words only, leaving whitespace at -1', () => {
    const { tokens } = buildWordTimeline('a bb')
    expect(tokens.map((token) => token.wordIndex)).toEqual([0, -1, 1])
  })

  it('gives longer words a longer share of the line', () => {
    const { wordEnds } = buildWordTimeline('a bbbbbbbb')
    expect(wordEnds[0]).toBeLessThan(0.2)
    expect(wordEnds[1]).toBe(1)
  })

  it('adds a pause after sentence-ending punctuation', () => {
    const plain = buildWordTimeline('stop now').wordEnds[0]!
    const paused = buildWordTimeline('stop. now').wordEnds[0]!
    expect(paused).toBeGreaterThan(plain)
  })

  it('handles Arabic text with diacritics', () => {
    const { wordEnds } = buildWordTimeline('مرحباً بكم جميعاً')
    expect(wordEnds).toHaveLength(3)
    expect(wordEnds.at(-1)).toBe(1)
  })

  it('returns an empty timeline for empty text', () => {
    expect(buildWordTimeline('   ').wordEnds).toEqual([])
  })
})

describe('getSpeechProgress', () => {
  it('stays at 0 before speech starts and at 1 after it ends', () => {
    expect(getSpeechProgress(10, 10, 20)).toBe(0)
    expect(getSpeechProgress(19.9, 10, 20)).toBe(1)
  })

  it('reaches the middle of the speech in the middle of the cue', () => {
    expect(getSpeechProgress(15, 10, 20)).toBeGreaterThan(0.4)
    expect(getSpeechProgress(15, 10, 20)).toBeLessThan(0.6)
  })

  it('treats a zero-length cue as already finished', () => {
    expect(getSpeechProgress(5, 5, 5)).toBe(1)
  })
})

describe('getActiveWordIndex', () => {
  const timeline = buildWordTimeline('one two three four')

  it('starts on the first word', () => {
    expect(getActiveWordIndex(timeline, 0)).toBe(0)
  })

  it('advances through the words as progress grows', () => {
    const indexes = [0, 0.3, 0.6, 0.9].map((progress) => getActiveWordIndex(timeline, progress))
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b))
    expect(new Set(indexes).size).toBeGreaterThan(2)
  })

  it('reports every word as read once the line is finished', () => {
    expect(getActiveWordIndex(timeline, 1)).toBe(4)
  })
})
