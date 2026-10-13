import { describe, it, expect } from 'vitest'
import { getValidContext, makeCloze } from './glossaryContext'
import type { GlossaryEntry } from '@/types/glossary.types'

describe('makeCloze', () => {
  it('blanks the word wherever it appears, ignoring letter case', () => {
    expect(makeCloze('Haus und haus', 'Haus')).toEqual({ text: '_____ und _____', hasBlank: true })
  })

  it('only matches whole words', () => {
    expect(makeCloze('Das Hausboot ist groß', 'Haus')).toEqual({ text: 'Das Hausboot ist groß', hasBlank: false })
  })

  it('handles letters beyond ASCII, such as German umlauts and Arabic', () => {
    expect(makeCloze('Ich bin müde heute', 'müde').text).toBe('Ich bin _____ heute')
    expect(makeCloze('أنا أحب القهوة كثيراً', 'القهوة').text).toBe('أنا أحب _____ كثيراً')
  })

  it('treats regex symbols in the word literally', () => {
    expect(makeCloze('Cost is (5+5) today', '(5+5)')).toEqual({ text: 'Cost is _____ today', hasBlank: true })
    // As a regex "a.b" would also match "axb"
    expect(makeCloze('axb and a.b', 'a.b').text).toBe('axb and _____')
  })

  it('reports when the word is not in the sentence, for example an inflected form', () => {
    expect(makeCloze('Er läuft schnell', 'laufen')).toEqual({ text: 'Er läuft schnell', hasBlank: false })
  })
})

describe('getValidContext', () => {
  const base = { id: 'x', word: 'w', languageCode: 'de', partOfSpeech: '', definition: '', example: null, addedAt: 1 }

  it('returns a well-formed context', () => {
    const context = { sentence: 'Hallo Welt', videoKey: 'yt:abc', time: 12.5 }
    expect(getValidContext({ ...base, context } as GlossaryEntry)).toEqual(context)
  })

  it.each([undefined, null, 'x', { sentence: 1, videoKey: 'a', time: 1 }, { sentence: 'a', videoKey: 'a', time: -1 }, { sentence: '', videoKey: 'a', time: 1 }])(
    'rejects %j',
    (context) => {
      expect(getValidContext({ ...base, context } as unknown as GlossaryEntry)).toBeNull()
    },
  )
})
