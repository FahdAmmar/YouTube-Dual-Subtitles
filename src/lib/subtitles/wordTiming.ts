import type { CueWord } from '@/types/subtitle.types'
import { tokenizeIntoWords, isWhitespaceToken, stripSurroundingPunctuation } from '@/lib/utils/wordTokenize'

/**
 * Subtitle files carry no per-word timing, so each word gets a share of the
 * cue duration proportional to its length. This is an estimate, not exact speech timing.
 */
const SENTENCE_END_PATTERN = /[.!?؟…]$/u
const CLAUSE_END_PATTERN = /[,;:،؛]$/u
const SENTENCE_PAUSE_WEIGHT = 3
const CLAUSE_PAUSE_WEIGHT = 1.5

/** Speech rarely fills the whole cue: it starts a moment late and ends a moment early */
const CUE_LEAD_IN_FRACTION = 0.05
const CUE_TAIL_FRACTION = 0.1

export interface ReadingToken {
  text: string
  /** Position among words only (whitespace tokens are -1) */
  wordIndex: number
}

export interface WordTimeline {
  tokens: ReadingToken[]
  /** Cumulative end of each word as a fraction of the speech window (last value is 1) */
  wordEnds: number[]
}

function getWordWeight(word: string): number {
  const letterCount = Array.from(stripSurroundingPunctuation(word)).length || 1
  if (SENTENCE_END_PATTERN.test(word)) return letterCount + SENTENCE_PAUSE_WEIGHT
  if (CLAUSE_END_PATTERN.test(word)) return letterCount + CLAUSE_PAUSE_WEIGHT
  return letterCount
}

export function buildWordTimeline(text: string): WordTimeline {
  const tokens: ReadingToken[] = []
  const weights: number[] = []

  for (const token of tokenizeIntoWords(text)) {
    if (isWhitespaceToken(token)) {
      tokens.push({ text: token, wordIndex: -1 })
    } else {
      tokens.push({ text: token, wordIndex: weights.length })
      weights.push(getWordWeight(token))
    }
  }

  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let running = 0
  const wordEnds = weights.map((weight) => {
    running += weight
    return running / total
  })

  return { tokens, wordEnds }
}

/** Maps a time inside a cue to progress through the speech itself (0 to 1) */
export function getSpeechProgress(currentTime: number, start: number, end: number): number {
  const duration = end - start
  if (duration <= 0) return 1
  const cueProgress = (currentTime - start) / duration
  const speechProgress = (cueProgress - CUE_LEAD_IN_FRACTION) / (1 - CUE_LEAD_IN_FRACTION - CUE_TAIL_FRACTION)
  return Math.min(1, Math.max(0, speechProgress))
}

/**
 * Index of the word being spoken. Words before it are read, words after it are
 * upcoming. Returns the word count once the whole line is finished.
 */
export function getActiveWordIndex(timeline: WordTimeline, speechProgress: number): number {
  if (speechProgress >= 1) return timeline.wordEnds.length
  const index = timeline.wordEnds.findIndex((end) => speechProgress < end)
  return index === -1 ? timeline.wordEnds.length : index
}

/**
 * Same meaning as getActiveWordIndex, for lines whose file gave the real start of
 * every word: the current word is the last one that has started.
 */
export function getActiveWordIndexAt(words: readonly CueWord[], currentTime: number, lineEnd: number): number {
  if (currentTime >= lineEnd) return words.length
  let active = 0
  for (let index = 0; index < words.length; index += 1) {
    if (words[index]!.start <= currentTime) active = index
    else break
  }
  return active
}
