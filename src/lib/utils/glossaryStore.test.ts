import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getGlossaryEntries,
  saveGlossaryEntry,
  deleteGlossaryEntry,
  makeGlossaryEntryId,
  updateGlossaryNote,
  GLOSSARY_CHANGED_EVENT,
  MAX_NOTE_LENGTH,
} from './glossaryStore'
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

describe('glossaryStore — change announcements', () => {
  it('announces every save and delete so other parts of the app can refresh', () => {
    const listener = vi.fn()
    window.addEventListener(GLOSSARY_CHANGED_EVENT, listener)
    saveGlossaryEntry(makeEntry())
    expect(listener).toHaveBeenCalledTimes(1)
    deleteGlossaryEntry(makeEntry().id)
    expect(listener).toHaveBeenCalledTimes(2)
    window.removeEventListener(GLOSSARY_CHANGED_EVENT, listener)
  })
})

describe('updateGlossaryNote', () => {
  it('stores the note on the entry and keeps the rest of it', () => {
    const entry = makeEntry({ translation: 'مرحبا' })
    saveGlossaryEntry(entry)
    updateGlossaryNote(entry.id, '  used when meeting someone  ')
    const saved = getGlossaryEntries()[0]
    expect(saved?.note).toBe('used when meeting someone')
    expect(saved?.translation).toBe('مرحبا')
  })

  it('removes the note when it is cleared', () => {
    const entry = makeEntry({ note: 'old' })
    saveGlossaryEntry(entry)
    updateGlossaryNote(entry.id, '   ')
    expect(getGlossaryEntries()[0]).not.toHaveProperty('note')
  })

  it('cuts a very long note to the limit', () => {
    const entry = makeEntry()
    saveGlossaryEntry(entry)
    updateGlossaryNote(entry.id, 'x'.repeat(MAX_NOTE_LENGTH + 50))
    expect(getGlossaryEntries()[0]?.note).toHaveLength(MAX_NOTE_LENGTH)
  })

  it('does nothing for a word that is not saved', () => {
    const listener = vi.fn()
    window.addEventListener(GLOSSARY_CHANGED_EVENT, listener)
    updateGlossaryNote('en::ghost', 'note')
    expect(getGlossaryEntries()).toEqual([])
    expect(listener).not.toHaveBeenCalled()
    window.removeEventListener(GLOSSARY_CHANGED_EVENT, listener)
  })
})
