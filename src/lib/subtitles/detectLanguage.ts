import type { SubtitleCue } from '@/types/subtitle.types'

export type DetectedLanguageCode = 'ar' | 'en' | 'de'

const ARABIC_LETTER = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g
const LATIN_LETTER = /[A-Za-z\u00C0-\u024F]/g
const WORD = /\p{L}+/gu
const GERMAN_ONLY_CHARS = /[äöüß]/g

// Stop words that are common in subtitles and rare in the other language.
// Ambiguous words (in, so, an, was, war, on, die...) are left out on purpose.
const ENGLISH_WORDS = new Set([
  'the', 'and', 'you', 'that', 'it', 'is', 'to', 'of', 'for', 'i', 'with', 'this', 'have', 'are',
  'not', 'but', 'they', 'what', 'we', 'be', 'your', 'just', 'like', 'know', 'there', 'do', 'he', 'she',
])
const GERMAN_WORDS = new Set([
  'der', 'die', 'das', 'und', 'nicht', 'ich', 'ist', 'ein', 'eine', 'mit', 'auf', 'für', 'von', 'zu',
  'es', 'wir', 'sie', 'auch', 'aber', 'wie', 'noch', 'dann', 'sehr', 'schon', 'ja', 'nein', 'doch',
  'wenn', 'dass', 'den', 'dem', 'im', 'bin', 'du', 'mal', 'hier', 'war', 'habe', 'sind',
])

/** Below this many scored words/letters there is not enough evidence to decide */
const MIN_EVIDENCE = 3
/** Share of Arabic letters (among all letters) above which the text is Arabic */
const ARABIC_SHARE_THRESHOLD = 0.5
/** Umlauts are strong German evidence, so each counts like several stop words */
const UMLAUT_WEIGHT = 2
/** Cues sampled per file; enough for a reliable result without scanning huge files */
const MAX_SAMPLED_CUES = 400

function stripMarkup(text: string): string {
  return text.replace(/<[^>]*>|\{[^}]*\}/g, ' ')
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0
}

/** Returns the language of the text, or null when evidence is too weak or tied */
export function detectLanguage(rawText: string): DetectedLanguageCode | null {
  const text = stripMarkup(rawText).toLowerCase()

  const arabicLetters = countMatches(text, ARABIC_LETTER)
  const latinLetters = countMatches(text, LATIN_LETTER)
  const totalLetters = arabicLetters + latinLetters
  if (totalLetters < MIN_EVIDENCE) return null
  if (arabicLetters / totalLetters > ARABIC_SHARE_THRESHOLD) return 'ar'

  let englishScore = 0
  let germanScore = countMatches(text, GERMAN_ONLY_CHARS) * UMLAUT_WEIGHT
  for (const word of text.match(WORD) ?? []) {
    if (ENGLISH_WORDS.has(word)) englishScore++
    if (GERMAN_WORDS.has(word)) germanScore++
  }

  if (Math.max(englishScore, germanScore) < MIN_EVIDENCE || englishScore === germanScore) return null
  return germanScore > englishScore ? 'de' : 'en'
}

export function detectLanguageFromCues(cues: readonly SubtitleCue[]): DetectedLanguageCode | null {
  return detectLanguage(
    cues
      .slice(0, MAX_SAMPLED_CUES)
      .map((cue) => cue.text)
      .join('\n'),
  )
}
