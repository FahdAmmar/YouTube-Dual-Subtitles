import { describe, it, expect } from 'vitest'
import { formatPerfect, formatPlural, summarizeForGlossary } from './readingDisplay'
import type { NounReading, VerbReading } from '@/types/dictionary.types'

const noun = (overrides: Partial<NounReading> = {}): NounReading => ({
  kind: 'noun',
  lemma: 'Haus',
  formDescription: null,
  translation: null,
  articles: ['das'],
  plural: ['Häuser'],
  pluralOnly: false,
  uncountable: false,
  ...overrides,
})

const verb = (overrides: Partial<VerbReading> = {}): VerbReading => ({
  kind: 'verb',
  lemma: 'gehen',
  formDescription: null,
  translation: null,
  thirdPerson: ['geht'],
  preterite: ['ging'],
  participle: ['gegangen'],
  auxiliary: ['sein'],
  ...overrides,
})

describe('formatPlural', () => {
  it('puts the plural article before each plural form', () => {
    expect(formatPlural(noun())).toBe('die Häuser')
    expect(formatPlural(noun({ lemma: 'Wort', plural: ['Wörter', 'Worte'] }))).toBe('die Wörter / die Worte')
  })

  it('is null when the noun has no plural', () => {
    expect(formatPlural(noun({ plural: [], uncountable: true }))).toBeNull()
  })
})

describe('formatPerfect', () => {
  it('joins the conjugated auxiliary and the past participle', () => {
    expect(formatPerfect(verb())).toBe('ist gegangen')
    expect(formatPerfect(verb({ lemma: 'machen', participle: ['gemacht'], auxiliary: ['haben'] }))).toBe('hat gemacht')
  })

  it('shows both auxiliaries when the verb takes either', () => {
    expect(formatPerfect(verb({ lemma: 'stehen', participle: ['gestanden'], auxiliary: ['haben', 'sein'] }))).toBe('hat/ist gestanden')
  })

  it('shows the participle alone when the auxiliary is unknown', () => {
    expect(formatPerfect(verb({ auxiliary: [] }))).toBe('gegangen')
  })

  it('is null without a participle', () => {
    expect(formatPerfect(verb({ participle: [] }))).toBeNull()
  })
})

describe('summarizeForGlossary', () => {
  it('keeps the lemma, article and first plural of a noun', () => {
    expect(summarizeForGlossary([noun({ plural: ['Wörter', 'Worte'], lemma: 'Wort' })])).toEqual({
      lemma: 'Wort',
      article: 'das',
      plural: 'Wörter',
    })
  })

  it('keeps only the lemma of a verb', () => {
    expect(summarizeForGlossary([verb()])).toEqual({ lemma: 'gehen' })
  })

  it('is empty without readings', () => {
    expect(summarizeForGlossary([])).toEqual({})
    expect(summarizeForGlossary(undefined)).toEqual({})
  })
})
