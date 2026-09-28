import { describe, it, expect, beforeEach } from 'vitest'
import { getGlossaryEntries, saveGlossaryEntry, deleteGlossaryEntry, makeGlossaryEntryId } from './glossaryStore'
import type { GlossaryEntry } from '@/types/glossary.types'

beforeEach(() => {
  window.localStorage.clear()
})

function makeEntry(overrides: Partial<GlossaryEntry> = {}): GlossaryEntry {
  const word = overrides.word ?? 'hello'
  const languageCode = overrides.languageCode ?? 'en'
  return {
    id: makeGlossaryEntryId(word, languageCode),
    word,
    languageCode,
    partOfSpeech: 'exclamation',
    definition: 'Used as a greeting.',
    example: null,
    addedAt: Date.now(),
    ...overrides,
  }
}

describe('glossaryStore', () => {
  it('returns an empty array when nothing has been saved yet', () => {
    expect(getGlossaryEntries()).toEqual([])
  })

  it('saves and retrieves an entry', () => {
    saveGlossaryEntry(makeEntry())
    const entries = getGlossaryEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.word).toBe('hello')
  })

  it('overwrites an existing entry with the same word and language instead of duplicating it', () => {
    saveGlossaryEntry(makeEntry({ definition: 'First definition' }))
    saveGlossaryEntry(makeEntry({ definition: 'Updated definition' }))

    const entries = getGlossaryEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.definition).toBe('Updated definition')
  })

  it('treats the same word in different languages as separate entries', () => {
    saveGlossaryEntry(makeEntry({ word: 'hola', languageCode: 'es' }))
    saveGlossaryEntry(makeEntry({ word: 'hola', languageCode: 'en' }))
    expect(getGlossaryEntries()).toHaveLength(2)
  })

  it('deletes an entry by id', () => {
    const entry = makeEntry()
    saveGlossaryEntry(entry)
    deleteGlossaryEntry(entry.id)
    expect(getGlossaryEntries()).toEqual([])
  })

  it('sorts entries with the most recently added first', () => {
    saveGlossaryEntry(makeEntry({ word: 'first', addedAt: 1000 }))
    saveGlossaryEntry(makeEntry({ word: 'second', addedAt: 2000 }))
    const entries = getGlossaryEntries()
    expect(entries.map((e) => e.word)).toEqual(['second', 'first'])
  })
})

describe('makeGlossaryEntryId', () => {
  it('is case-insensitive and trims whitespace on the word', () => {
    expect(makeGlossaryEntryId('  Hello  ', 'en')).toBe(makeGlossaryEntryId('hello', 'en'))
  })

  it('differs by language code', () => {
    expect(makeGlossaryEntryId('hola', 'es')).not.toBe(makeGlossaryEntryId('hola', 'en'))
  })
})
