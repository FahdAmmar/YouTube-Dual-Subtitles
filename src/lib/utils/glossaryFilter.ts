import type { GlossaryEntry } from '@/types/glossary.types'
import { getValidContext } from './glossaryContext'
import { getDueAt, getReviewBox, isDue } from './spacedRepetition'

/** From this Leitner box on (a 14-day wait or more) a word counts as known */
export const MASTERED_BOX = 4

export type GlossaryStatusFilter = 'all' | 'due' | 'new' | 'learning' | 'mastered'
export type GlossarySort = 'newest' | 'oldest' | 'alphabetical' | 'dueSoonest'

/** What the learner has chosen in the vocabulary panel's search tools */
export interface GlossaryFilters {
  query: string
  status: GlossaryStatusFilter
  sort: GlossarySort
  onlyThisVideo: boolean
}

export const DEFAULT_GLOSSARY_FILTERS: GlossaryFilters = {
  query: '',
  status: 'all',
  sort: 'newest',
  onlyThisVideo: false,
}

export interface GlossaryFilterOptions {
  query: string
  status: GlossaryStatusFilter
  sort: GlossarySort
  /** Only words met in this video (same key as watch history); null for all videos */
  videoKey: string | null
  now: number
}

/** Case, accents and Arabic vowel marks must not stop a search from matching ("hauser" finds "Häuser") */
export function normalizeForSearch(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

function searchableText(entry: GlossaryEntry): string {
  return normalizeForSearch(
    [
      entry.word,
      entry.lemma,
      entry.translation,
      entry.definition,
      entry.note,
      getValidContext(entry)?.sentence,
    ]
      .filter((part): part is string => typeof part === 'string')
      .join(' '),
  )
}

function matchesStatus(entry: GlossaryEntry, status: GlossaryStatusFilter, now: number): boolean {
  const box = getReviewBox(entry)
  switch (status) {
    case 'all':
      return true
    case 'due':
      return isDue(entry, now)
    case 'new':
      return box === null
    case 'learning':
      return box !== null && box < MASTERED_BOX
    case 'mastered':
      return box !== null && box >= MASTERED_BOX
  }
}

function compareBySort(sort: GlossarySort): (a: GlossaryEntry, b: GlossaryEntry) => number {
  switch (sort) {
    case 'newest':
      return (a, b) => b.addedAt - a.addedAt
    case 'oldest':
      return (a, b) => a.addedAt - b.addedAt
    case 'alphabetical':
      return (a, b) => (a.lemma ?? a.word).localeCompare(b.lemma ?? b.word, undefined, { sensitivity: 'base' })
    case 'dueSoonest':
      return (a, b) => getDueAt(a) - getDueAt(b) || a.addedAt - b.addedAt
  }
}

/** Search, filter and sort the vocabulary list. Returns a new array; the input is left untouched. */
export function filterGlossaryEntries(
  entries: readonly GlossaryEntry[],
  { query, status, sort, videoKey, now }: GlossaryFilterOptions,
): GlossaryEntry[] {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean)
  return entries
    .filter((entry) => matchesStatus(entry, status, now))
    .filter((entry) => videoKey === null || getValidContext(entry)?.videoKey === videoKey)
    .filter((entry) => {
      if (terms.length === 0) return true
      const haystack = searchableText(entry)
      return terms.every((term) => haystack.includes(term))
    })
    .sort(compareBySort(sort))
}
