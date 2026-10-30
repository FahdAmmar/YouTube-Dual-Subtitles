import { describe, it, expect } from 'vitest'
import { buildSavedWordSet, isSavedWord } from './savedWords'
import type { GlossaryEntry } from '@/types/glossary.types'

const entry = (word: string, patch: Partial<GlossaryEntry> = {}): GlossaryEntry => ({
  id: `de::${word.toLowerCase()}`,
  word,
  languageCode: 'de',
  partOfSpeech: '',
  definition: '',
  example: null,
  addedAt: 1,
  ...patch,
})

describe('buildSavedWordSet / isSavedWord', () => {
  it('knows the saved word as written and its dictionary form', () => {
    const saved = buildSavedWordSet([entry('gegangen', { lemma: 'gehen' })], 'de')
    expect(isSavedWord(saved, 'gegangen')).toBe(true)
    expect(isSavedWord(saved, 'gehen')).toBe(true)
    expect(isSavedWord(saved, 'gehst')).toBe(false)
  })

  it('ignores letter case and punctuation stuck to the word', () => {
    const saved = buildSavedWordSet([entry('Haus')], 'de')
    expect(isSavedWord(saved, '«Haus,»')).toBe(true)
    expect(isSavedWord(saved, 'HAUS')).toBe(true)
  })

  it('only counts words of the language being watched', () => {
    const saved = buildSavedWordSet([entry('Brot'), entry('pain', { languageCode: 'fr', id: 'fr::pain' })], 'de')
    expect(isSavedWord(saved, 'Brot')).toBe(true)
    expect(isSavedWord(saved, 'pain')).toBe(false)
  })

  it('treats a bare punctuation token as not saved', () => {
    expect(isSavedWord(buildSavedWordSet([entry('Haus')], 'de'), '—')).toBe(false)
  })
})
