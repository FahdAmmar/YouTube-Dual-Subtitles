import { describe, it, expect } from 'vitest'
import { glossaryToAnki, makeAnkiCloze } from './glossaryAnkiExport'
import type { GlossaryEntry } from '@/types/glossary.types'

const entry = (patch: Partial<GlossaryEntry>): GlossaryEntry => ({
  id: 'x',
  word: 'müde',
  languageCode: 'de',
  partOfSpeech: 'adj',
  translation: 'متعب',
  definition: 'Needing rest.',
  example: null,
  addedAt: 1,
  ...patch,
})

describe('makeAnkiCloze', () => {
  it('wraps the word in cloze syntax with the translation as the hint', () => {
    expect(makeAnkiCloze('Ich bin müde heute', 'müde', 'متعب')).toBe('Ich bin {{c1::müde::متعب}} heute')
  })

  it('works without a hint', () => {
    expect(makeAnkiCloze('Ich bin müde', 'müde', null)).toBe('Ich bin {{c1::müde}}')
  })

  it('uses the same cloze number for every occurrence so they hide together', () => {
    expect(makeAnkiCloze('Haus und Haus', 'Haus', null)).toBe('{{c1::Haus}} und {{c1::Haus}}')
  })

  it('returns null when the word is not in the sentence', () => {
    expect(makeAnkiCloze('Er läuft', 'laufen', null)).toBeNull()
  })

  it('does not break when the hint itself contains the cloze delimiter', () => {
    expect(makeAnkiCloze('Ich bin müde', 'müde', 'a::b')).toBe('Ich bin {{c1::müde::a: :b}}')
  })
})

describe('glossaryToAnki', () => {
  it('starts with the file headers that make Anki pick the Cloze note type and the columns', () => {
    const output = glossaryToAnki([entry({})])
    expect(output.split('\n').slice(0, 4)).toEqual([
      '#separator:tab',
      '#html:false',
      '#notetype:Cloze',
      '#columns:Text\tExtra\tTags',
    ])
  })

  it('builds the sentence cloze with the answer details and tags', () => {
    const output = glossaryToAnki([
      entry({ context: { sentence: 'Ich bin müde heute', videoKey: 'youtube:dQw4w9WgXcQ', time: 62 } }),
    ])
    const row = output.trimEnd().split('\n').at(-1)!
    const [text, extra, tags] = row.split('\t')
    expect(text).toBe('Ich bin {{c1::müde::متعب}} heute')
    expect(extra).toContain('متعب')
    expect(extra).toContain('Needing rest.')
    expect(extra).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=62s')
    expect(tags).toBe('ydc de adj')
  })

  it('falls back to the word alone when no sentence was saved', () => {
    const row = glossaryToAnki([entry({})]).trimEnd().split('\n').at(-1)!
    expect(row.split('\t')[0]).toBe('{{c1::müde::متعب}}')
  })

  it('falls back to the word alone when the sentence does not contain it as written', () => {
    const row = glossaryToAnki([entry({ word: 'laufen', context: { sentence: 'Er läuft schnell', videoKey: 'k', time: 1 } })])
      .trimEnd()
      .split('\n')
      .at(-1)!
    expect(row.split('\t')[0]).toBe('{{c1::laufen::متعب}}')
    expect(row.split('\t')[1]).toContain('Er läuft schnell')
  })

  it('keeps tabs and line breaks from untrusted text out of the file structure', () => {
    const row = glossaryToAnki([entry({ definition: 'two\tparts\nand a break' })]).trimEnd().split('\n').at(-1)!
    expect(row.split('\t')).toHaveLength(3)
    expect(row).not.toContain('\r')
  })

  it('removes spaces from tags, which Anki would read as separators', () => {
    const row = glossaryToAnki([entry({ partOfSpeech: 'proper noun' })]).trimEnd().split('\n').at(-1)!
    expect(row.split('\t')[2]).toBe('ydc de proper_noun')
  })

  it('neutralises spreadsheet formulas, like the CSV export does', () => {
    const row = glossaryToAnki([entry({ translation: '=HYPERLINK("http://evil")' })]).trimEnd().split('\n').at(-1)!
    expect(row.split('\t')[1]).toMatch(/^'=HYPERLINK/)
  })

  it('links only YouTube scenes, never a local file name or a made-up key', () => {
    const local = glossaryToAnki([entry({ context: { sentence: 'Ich bin müde', videoKey: 'local:movie.mp4', time: 5 } })])
    expect(local).not.toContain('http')
    const tampered = glossaryToAnki([entry({ context: { sentence: 'Ich bin müde', videoKey: 'youtube:x"><script>', time: 5 } })])
    expect(tampered).not.toContain('<script>')
  })
})
