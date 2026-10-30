import { describe, it, expect } from 'vitest'
import { filterGlossaryEntries, normalizeForSearch, type GlossaryFilterOptions } from './glossaryFilter'
import { DAY_MS } from './spacedRepetition'
import type { GlossaryEntry } from '@/types/glossary.types'

const NOW = new Date('2026-10-05T10:00:00Z').getTime()

const entry = (id: string, patch: Partial<GlossaryEntry> = {}): GlossaryEntry => ({
  id,
  word: id,
  languageCode: 'de',
  partOfSpeech: '',
  definition: '',
  example: null,
  addedAt: NOW - 1000,
  ...patch,
})

const reviewed = (box: number, dueAt: number): GlossaryEntry['review'] => ({ box, dueAt, lastReviewedAt: NOW - DAY_MS })

const DEFAULTS: GlossaryFilterOptions = { query: '', status: 'all', sort: 'newest', videoKey: null, now: NOW }
const run = (entries: GlossaryEntry[], patch: Partial<GlossaryFilterOptions> = {}) =>
  filterGlossaryEntries(entries, { ...DEFAULTS, ...patch }).map((item) => item.id)

describe('normalizeForSearch', () => {
  it('ignores letter case, accents and Arabic vowel marks', () => {
    expect(normalizeForSearch('  Häuser ')).toBe('hauser')
    expect(normalizeForSearch('مرحباً')).toBe(normalizeForSearch('مرحبا'))
  })
})

describe('filterGlossaryEntries — search', () => {
  const entries = [
    entry('Haus', { translation: 'بيت', lemma: 'Haus', context: { sentence: 'Das ist mein Haus', videoKey: 'yt:1', time: 3 } }),
    entry('gegangen', { lemma: 'gehen', translation: 'ذهب', note: 'Partizip II' }),
    entry('Brot', { definition: 'baked food', translation: 'خبز' }),
  ]

  it('returns everything for an empty or blank query', () => {
    expect(run(entries)).toHaveLength(3)
    expect(run(entries, { query: '   ' })).toHaveLength(3)
  })

  it('finds a word by its form, lemma, translation, definition, sentence or note', () => {
    expect(run(entries, { query: 'gehen' })).toEqual(['gegangen'])
    expect(run(entries, { query: 'خبز' })).toEqual(['Brot'])
    expect(run(entries, { query: 'baked' })).toEqual(['Brot'])
    expect(run(entries, { query: 'mein' })).toEqual(['Haus'])
    expect(run(entries, { query: 'partizip' })).toEqual(['gegangen'])
  })

  it('matches regardless of accents and letter case', () => {
    expect(run([entry('Häuser')], { query: 'HAUSER' })).toEqual(['Häuser'])
  })

  it('requires every typed word to match, in any order', () => {
    expect(run(entries, { query: 'haus mein' })).toEqual(['Haus'])
    expect(run(entries, { query: 'haus brot' })).toEqual([])
  })
})

describe('filterGlossaryEntries — status', () => {
  const entries = [
    entry('fresh'),
    entry('overdue', { review: reviewed(1, NOW - 1) }),
    entry('waiting', { review: reviewed(2, NOW + DAY_MS) }),
    entry('known', { review: reviewed(5, NOW + 30 * DAY_MS) }),
  ]

  it('"due" matches what the review button counts: new words and overdue ones', () => {
    expect(run(entries, { status: 'due', sort: 'oldest' }).sort()).toEqual(['fresh', 'overdue'])
  })

  it('"new" is only never-reviewed words', () => {
    expect(run(entries, { status: 'new' })).toEqual(['fresh'])
  })

  it('splits reviewed words into learning and mastered', () => {
    expect(run(entries, { status: 'learning' }).sort()).toEqual(['overdue', 'waiting'])
    expect(run(entries, { status: 'mastered' })).toEqual(['known'])
  })
})

describe('filterGlossaryEntries — video', () => {
  it('keeps only words met in the given video, and drops words with no context', () => {
    const entries = [
      entry('a', { context: { sentence: 's', videoKey: 'yt:1', time: 1 } }),
      entry('b', { context: { sentence: 's', videoKey: 'yt:2', time: 1 } }),
      entry('c'),
    ]
    expect(run(entries, { videoKey: 'yt:1' })).toEqual(['a'])
  })
})

describe('filterGlossaryEntries — sort', () => {
  const entries = [
    entry('b', { addedAt: 2, lemma: 'Zebra', review: reviewed(1, NOW + 5 * DAY_MS) }),
    entry('a', { addedAt: 3, review: reviewed(1, NOW + DAY_MS) }),
    entry('c', { addedAt: 1 }),
  ]

  it('sorts by date added, newest or oldest first', () => {
    expect(run(entries, { sort: 'newest' })).toEqual(['a', 'b', 'c'])
    expect(run(entries, { sort: 'oldest' })).toEqual(['c', 'b', 'a'])
  })

  it('sorts alphabetically by the dictionary form when there is one', () => {
    expect(run(entries, { sort: 'alphabetical' })).toEqual(['a', 'c', 'b'])
  })

  it('sorts by when the word is next due, with never-reviewed words first', () => {
    expect(run(entries, { sort: 'dueSoonest' })).toEqual(['c', 'a', 'b'])
  })

  it('does not change the order of the list it was given', () => {
    const input = [...entries]
    run(input, { sort: 'alphabetical' })
    expect(input.map((item) => item.id)).toEqual(['b', 'a', 'c'])
  })
})
