import { describe, it, expect } from 'vitest'
import { glossaryToCsv } from './glossaryExport'
import type { GlossaryEntry } from '@/types/glossary.types'

function makeEntry(overrides: Partial<GlossaryEntry> = {}): GlossaryEntry {
  return {
    id: 'de::haus',
    word: 'Haus',
    languageCode: 'de',
    partOfSpeech: 'noun',
    translation: 'منزل',
    definition: 'A building for living in.',
    example: 'Das Haus ist groß.',
    addedAt: 1,
    ...overrides,
  }
}

describe('glossaryToCsv', () => {
  it('writes one headerless row per entry: word, translation, definition, example, part of speech, language', () => {
    expect(glossaryToCsv([makeEntry()])).toBe(
      'Haus,منزل,A building for living in.,Das Haus ist groß.,noun,de\r\n',
    )
  })

  it('returns an empty string for an empty glossary', () => {
    expect(glossaryToCsv([])).toBe('')
  })

  it('leaves missing translation and example as empty cells', () => {
    const row = glossaryToCsv([makeEntry({ translation: undefined, example: null })])
    expect(row).toBe('Haus,,A building for living in.,,noun,de\r\n')
  })

  it('quotes cells containing commas, quotes or line breaks, doubling inner quotes', () => {
    const csv = glossaryToCsv([makeEntry({ definition: 'a, "b"\nc' })])
    expect(csv).toContain('"a, ""b""\nc"')
  })

  it('neutralises spreadsheet formulas in untrusted text', () => {
    const csv = glossaryToCsv([makeEntry({ word: '=HYPERLINK("x")', translation: '@SUM(A1)', definition: '+1', example: '-2' })])
    expect(csv).toContain("'=HYPERLINK")
    expect(csv).toContain("'@SUM(A1)")
    expect(csv).toContain("'+1")
    expect(csv).toContain("'-2")
  })

  it('joins several entries in the given order', () => {
    const csv = glossaryToCsv([makeEntry({ word: 'a' }), makeEntry({ word: 'b' })])
    expect(csv.split('\r\n')).toEqual([expect.stringMatching(/^a,/), expect.stringMatching(/^b,/), ''])
  })
})
