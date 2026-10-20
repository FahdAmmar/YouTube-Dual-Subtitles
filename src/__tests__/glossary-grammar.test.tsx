import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GlossaryPanel } from '@/components/console/GlossaryPanel'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import type { GlossaryEntry } from '@/types/glossary.types'

function seed(entries: GlossaryEntry[]) {
  window.localStorage.setItem(STORAGE_KEYS.GLOSSARY, JSON.stringify(Object.fromEntries(entries.map((e) => [e.id, e]))))
}

const BASE: GlossaryEntry = {
  id: 'de::häuser',
  word: 'Häuser',
  languageCode: 'de',
  partOfSpeech: 'Noun',
  translation: 'منازل',
  definition: '',
  example: null,
  addedAt: 1,
}

beforeEach(() => window.localStorage.clear())

describe('GlossaryPanel grammar line', () => {
  it('shows the article, lemma and plural saved with a noun', () => {
    seed([{ ...BASE, lemma: 'Haus', article: 'das', plural: 'Häuser' }])
    render(<GlossaryPanel isOpen onClose={() => {}} />)

    expect(screen.getByText('das Haus')).toBeInTheDocument()
    expect(screen.getByText(/Pl\. Häuser/)).toBeInTheDocument()
  })

  it('shows the infinitive saved with an inflected verb', () => {
    seed([{ ...BASE, id: 'de::gegangen', word: 'gegangen', partOfSpeech: 'Participle', lemma: 'gehen' }])
    render(<GlossaryPanel isOpen onClose={() => {}} />)

    expect(screen.getByText('gehen')).toBeInTheDocument()
  })

  it('renders entries saved before grammar existed without any extra line', () => {
    seed([BASE])
    render(<GlossaryPanel isOpen onClose={() => {}} />)

    expect(screen.getByText('منازل')).toBeInTheDocument()
    expect(screen.queryByText(/Pl\./)).not.toBeInTheDocument()
  })
})
