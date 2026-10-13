import type { GlossaryContext, GlossaryEntry } from '@/types/glossary.types'

const BLANK = '_____'

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Hides the word inside its sentence for a fill-in-the-blank card. Matching is on whole
 * words only, in any language; hasBlank is false when the word is not there as written
 * (for example an inflected form), so the caller can fall back to showing the sentence.
 */
export function makeCloze(sentence: string, word: string): { text: string; hasBlank: boolean } {
  const { text, hasMatch } = replaceWholeWord(sentence, word, () => BLANK)
  return { text, hasBlank: hasMatch }
}

/** Replaces each whole-word occurrence (any language, any letter case); the callback gets the text as written */
export function replaceWholeWord(
  sentence: string,
  word: string,
  replacement: (matched: string) => string,
): { text: string; hasMatch: boolean } {
  const trimmed = word.trim()
  if (!trimmed) return { text: sentence, hasMatch: false }
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(trimmed)}(?![\\p{L}\\p{N}])`, 'giu')
  let hasMatch = false
  const text = sentence.replace(pattern, (matched) => {
    hasMatch = true
    return replacement(matched)
  })
  return { text, hasMatch }
}

/** Stored data may be missing or malformed (older versions, restored backups) */
export function getValidContext(entry: GlossaryEntry): GlossaryContext | null {
  const context: unknown = entry.context
  if (typeof context !== 'object' || context === null) return null
  const { sentence, videoKey, time } = context as Record<string, unknown>
  if (typeof sentence !== 'string' || !sentence.trim()) return null
  if (typeof videoKey !== 'string' || !videoKey) return null
  if (typeof time !== 'number' || !Number.isFinite(time) || time < 0) return null
  return { sentence, videoKey, time }
}
