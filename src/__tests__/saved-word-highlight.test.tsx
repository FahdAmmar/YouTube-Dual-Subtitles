import { describe, it, expect, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { ClickableWords } from '@/components/subtitles/ClickableWords'
import { SavedWordsProvider } from '@/context/SavedWordsContext'
import { makeGlossaryEntryId, saveGlossaryEntry, deleteGlossaryEntry } from '@/lib/utils/glossaryStore'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import type { GlossaryEntry } from '@/types/glossary.types'

function makeEntry(word: string, patch: Partial<GlossaryEntry> = {}): GlossaryEntry {
  return {
    id: makeGlossaryEntryId(word, patch.languageCode ?? 'de'),
    word,
    languageCode: 'de',
    partOfSpeech: '',
    definition: '',
    example: null,
    addedAt: Date.now(),
    ...patch,
  }
}

function renderLine(languageCode = 'de') {
  return render(
    <SavedWordsProvider languageCode={languageCode}>
      <ClickableWords text="Das Haus ist alt." onWordClick={() => {}} />
    </SavedWordsProvider>,
  )
}

const isMarked = (name: RegExp) => screen.getByRole('button', { name }).getAttribute('data-saved') === 'true'

beforeEach(() => {
  window.localStorage.clear()
})

describe('saved words are marked inside the subtitle line', () => {
  it('marks only the words already saved in the vocabulary', () => {
    saveGlossaryEntry(makeEntry('Haus'))
    renderLine()
    expect(isMarked(/Haus/)).toBe(true)
    expect(isMarked(/Das/)).toBe(false)
  })

  it('tells screen-reader users that the word is saved, not only sighted users through an underline', () => {
    saveGlossaryEntry(makeEntry('alt'))
    renderLine()
    expect(screen.getByRole('button', { name: /alt.*محفوظة في المفردات/ })).toBeInTheDocument()
  })

  it('marks a word as soon as it is saved, and unmarks it when it is removed', () => {
    renderLine()
    expect(isMarked(/alt/)).toBe(false)

    act(() => saveGlossaryEntry(makeEntry('alt')))
    expect(isMarked(/alt/)).toBe(true)

    act(() => deleteGlossaryEntry(makeEntry('alt').id))
    expect(isMarked(/alt/)).toBe(false)
  })

  it('recognises a saved word by its dictionary form too', () => {
    saveGlossaryEntry(makeEntry('Häuser', { lemma: 'Haus' }))
    renderLine()
    expect(isMarked(/Haus/)).toBe(true)
  })

  it('ignores words saved in another language', () => {
    saveGlossaryEntry(makeEntry('Haus', { languageCode: 'en' }))
    renderLine('de')
    expect(isMarked(/Haus/)).toBe(false)
  })

  it('marks nothing when the learner switched the highlight off', () => {
    saveGlossaryEntry(makeEntry('Haus'))
    window.localStorage.setItem(STORAGE_KEYS.HIGHLIGHT_SAVED_WORDS, 'false')
    renderLine()
    expect(isMarked(/Haus/)).toBe(false)
  })

  it('still renders every word when used outside the provider', () => {
    render(<ClickableWords text="Das Haus" onWordClick={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})
