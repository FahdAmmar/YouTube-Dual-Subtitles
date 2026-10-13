import type { SubtitleCue } from '@/types/subtitle.types'

/**
 * Keeps a cue's word timings only if they describe exactly the words of its text,
 * in order, with times that never go backwards. A highlight that is out of step
 * with the text would be worse than none: callers fall back to an estimate.
 */
export function alignCueWords(cue: SubtitleCue): SubtitleCue {
  if (!cue.words) return cue

  const tokens = cue.text.split(/\s+/).filter(Boolean)
  const isAligned =
    cue.words.length === tokens.length &&
    cue.words.every((word, index) => {
      const previousStart = index === 0 ? Number.NEGATIVE_INFINITY : cue.words![index - 1]!.start
      return word.text === tokens[index] && Number.isFinite(word.start) && word.start >= previousStart
    })

  if (isAligned) return cue
  return { start: cue.start, end: cue.end, text: cue.text }
}
