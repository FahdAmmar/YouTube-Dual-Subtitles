import { describe, it, expect } from 'vitest'
import { detectLanguage, detectLanguageFromCues } from './detectLanguage'

describe('detectLanguage', () => {
  it('detects Arabic by script', () => {
    expect(detectLanguage('نعم، في البداية. كيف حالك اليوم؟')).toBe('ar')
  })

  it('detects Arabic even with a few Latin words mixed in', () => {
    expect(detectLanguage('شاهدت فيديو على YouTube أمس وكان رائعاً جداً')).toBe('ar')
  })

  it('detects German', () => {
    expect(detectLanguage('Ja, am Anfang schon. Ich glaube, das ist nicht so einfach für mich.')).toBe('de')
  })

  it('detects German from umlauts when stop words are scarce', () => {
    expect(detectLanguage('Größe Übung Käse Möbel Straße')).toBe('de')
  })

  it('detects English', () => {
    expect(detectLanguage("I think that this is not what you wanted, but we have to go with it.")).toBe('en')
  })

  it('returns null for empty or too-short text', () => {
    expect(detectLanguage('')).toBeNull()
    expect(detectLanguage('OK')).toBeNull()
  })

  it('returns null for unrelated Latin text (no evidence)', () => {
    expect(detectLanguage('Xyzzy plugh quux frobnicate blorf grault')).toBeNull()
  })

  it('ignores SRT/HTML markup and numbers', () => {
    expect(detectLanguage('<i>Ich bin nicht sicher</i> 12:30 {\\an8} und du?')).toBe('de')
  })
})

describe('detectLanguageFromCues', () => {
  const cue = (text: string, index: number) => ({ start: index, end: index + 1, text })

  it('detects from many cues combined', () => {
    const cues = ['Ja, am Anfang schon.', 'Das war nicht einfach.', 'Wir haben es mit ihr gemacht.'].map(cue)
    expect(detectLanguageFromCues(cues)).toBe('de')
  })

  it('returns null for no cues', () => {
    expect(detectLanguageFromCues([])).toBeNull()
  })
})
