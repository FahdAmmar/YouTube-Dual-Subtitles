import { describe, it, expect } from 'vitest'
import { tokenizeIntoWords, isWhitespaceToken, stripSurroundingPunctuation } from './wordTokenize'

describe('tokenizeIntoWords', () => {
  it('splits text into word and whitespace tokens that reconstruct the original text', () => {
    const text = 'Hello, world!  How are you?'
    const tokens = tokenizeIntoWords(text)
    expect(tokens.join('')).toBe(text)
    expect(tokens).toContain('Hello,')
    expect(tokens).toContain('world!')
  })

  it('returns an empty array for empty input', () => {
    expect(tokenizeIntoWords('')).toEqual([])
  })
})

describe('isWhitespaceToken', () => {
  it('identifies whitespace-only tokens', () => {
    expect(isWhitespaceToken('   ')).toBe(true)
    expect(isWhitespaceToken('\n')).toBe(true)
  })

  it('rejects tokens containing non-whitespace characters', () => {
    expect(isWhitespaceToken('hello')).toBe(false)
    expect(isWhitespaceToken(' a ')).toBe(false)
  })
})

describe('stripSurroundingPunctuation', () => {
  it('removes leading and trailing punctuation', () => {
    expect(stripSurroundingPunctuation('hello,')).toBe('hello')
    expect(stripSurroundingPunctuation('"world"')).toBe('world')
    expect(stripSurroundingPunctuation('...wait...')).toBe('wait')
  })

  it('leaves internal punctuation (e.g. contractions) intact', () => {
    expect(stripSurroundingPunctuation("don't")).toBe("don't")
  })

  it('preserves non-Latin letters (e.g. Arabic)', () => {
    expect(stripSurroundingPunctuation('«مرحباً»')).toBe('مرحباً')
  })

  it('returns an empty string for punctuation-only input', () => {
    expect(stripSurroundingPunctuation('...')).toBe('')
  })
})
