import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { WordDefinitionCard } from '@/components/console/WordDefinitionCard'
import { lookupWord, type WordLookupResult } from '@/lib/utils/wordLookup'
import { getGlossaryEntries } from '@/lib/utils/glossaryStore'
import type { GrammarReading } from '@/types/dictionary.types'

vi.mock('@/lib/utils/wordLookup', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils/wordLookup')>()),
  lookupWord: vi.fn(),
}))

const HAUS: GrammarReading = {
  kind: 'noun',
  lemma: 'Haus',
  formDescription: null,
  translation: null,
  articles: ['das'],
  plural: ['Häuser'],
  pluralOnly: false,
  uncountable: false,
}

const GEHEN: GrammarReading = {
  kind: 'verb',
  lemma: 'gehen',
  formDescription: 'past participle of gehen',
  translation: 'يذهب',
  thirdPerson: ['geht'],
  preterite: ['ging'],
  participle: ['gegangen'],
  auxiliary: ['sein'],
}

function stubLookup(word: string, translation: string, readings?: GrammarReading[]) {
  const result: WordLookupResult = {
    word,
    translation,
    alternatives: [],
    meanings: [],
    ...(readings ? { grammar: { readings } } : {}),
  }
  vi.mocked(lookupWord).mockResolvedValue({ kind: 'found', result })
}

function renderCard(word: string) {
  return render(<WordDefinitionCard word={word} languageCode="de" nativeLanguageCode="ar" onClose={() => {}} />)
}

beforeEach(() => {
  window.localStorage.clear()
  vi.mocked(lookupWord).mockReset()
})

describe('WordDefinitionCard grammar', () => {
  it('shows the article, the lemma and the plural of a noun beside its translation', async () => {
    stubLookup('Haus', 'منزل', [HAUS])
    renderCard('Haus')

    const grammar = await screen.findByRole('group', { name: 'قواعد الكلمة' })
    expect(within(grammar).getByText('das')).toBeInTheDocument()
    expect(within(grammar).getByText('Haus')).toBeInTheDocument()
    expect(within(grammar).getByText('die Häuser')).toBeInTheDocument()
    expect(screen.getByText('منزل')).toBeInTheDocument()
  })

  it('shows the infinitive, its principal parts and its translation for an inflected verb form', async () => {
    stubLookup('gegangen', 'ذهب', [GEHEN])
    renderCard('gegangen')

    const grammar = await screen.findByRole('group', { name: 'قواعد الكلمة' })
    expect(within(grammar).getByText('gehen')).toBeInTheDocument()
    expect(within(grammar).getByText('past participle of gehen')).toBeInTheDocument()
    expect(within(grammar).getByText('يذهب')).toBeInTheDocument()
    expect(within(grammar).getByText('geht')).toBeInTheDocument()
    expect(within(grammar).getByText('ging')).toBeInTheDocument()
    expect(within(grammar).getByText('ist gegangen')).toBeInTheDocument()
  })

  it('says when a noun has no plural or exists only in the plural', async () => {
    stubLookup('Gold', 'ذهب', [{ ...HAUS, lemma: 'Gold', plural: [], uncountable: true }])
    const { unmount } = renderCard('Gold')
    expect(await screen.findByText('لا جمع له')).toBeInTheDocument()
    unmount()

    stubLookup('Eltern', 'والدان', [{ ...HAUS, lemma: 'Eltern', articles: ['die'], plural: ['Eltern'], pluralOnly: true }])
    renderCard('Eltern')
    expect(await screen.findByText('يُستعمل بصيغة الجمع فقط')).toBeInTheDocument()
  })

  it('lists every reading of an ambiguous word', async () => {
    stubLookup('See', 'بحيرة', [
      { ...HAUS, lemma: 'See', articles: ['der'], plural: ['Seen'] },
      { ...HAUS, lemma: 'See', articles: ['die'], plural: [] , uncountable: true },
    ])
    renderCard('See')

    const grammar = await screen.findByRole('group', { name: 'قواعد الكلمة' })
    expect(within(grammar).getByText('der')).toBeInTheDocument()
    expect(within(grammar).getByText('die')).toBeInTheDocument()
  })

  it('renders no grammar block for a language without grammar data', async () => {
    stubLookup('world', 'عالم')
    renderCard('world')

    expect(await screen.findByText('عالم')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'قواعد الكلمة' })).not.toBeInTheDocument()
  })

  it('saves the lemma, article and plural with the word in the vocabulary', async () => {
    stubLookup('Häuser', 'منازل', [HAUS])
    renderCard('Häuser')

    fireEvent.click(await screen.findByRole('button', { name: 'أضف إلى المفردات' }))

    await waitFor(() => expect(getGlossaryEntries()).toHaveLength(1))
    expect(getGlossaryEntries()[0]).toMatchObject({ word: 'Häuser', lemma: 'Haus', article: 'das', plural: 'Häuser' })
  })
})
