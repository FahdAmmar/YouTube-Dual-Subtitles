import type { GlossaryEntry } from '@/types/glossary.types'
import { stripSurroundingPunctuation } from './wordTokenize'

function toKey(word: string): string {
  return stripSurroundingPunctuation(word).toLowerCase()
}

/** Words of one language that the learner already saved, as written and in dictionary form, for fast lookup */
export function buildSavedWordSet(entries: readonly GlossaryEntry[], languageCode: string): ReadonlySet<string> {
  const saved = new Set<string>()
  for (const entry of entries) {
    if (entry.languageCode !== languageCode) continue
    for (const word of [entry.word, entry.lemma]) {
      const key = word ? toKey(word) : ''
      if (key) saved.add(key)
    }
  }
  return saved
}

/** Whether a word as it appears in a line (with any punctuation stuck to it) is a saved word */
export function isSavedWord(saved: ReadonlySet<string>, rawWord: string): boolean {
  const key = toKey(rawWord)
  return key !== '' && saved.has(key)
}
