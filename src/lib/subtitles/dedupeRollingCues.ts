import type { SubtitleCue } from '@/types/subtitle.types'

/** A "bridge" cue is the near-instant duplicate YouTube inserts between rolling captions */
const BRIDGE_MAX_DURATION_SECONDS = 0.1
const MIN_BRIDGE_CUES = 2
const MIN_BRIDGE_RATIO = 0.2

function splitLines(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean)
}

/** How many leading lines of `lines` repeat the trailing lines of `previous` */
function countCarriedLines(previous: string[], lines: string[]): number {
  for (let count = Math.min(previous.length, lines.length); count > 0; count -= 1) {
    const carried = previous.slice(previous.length - count)
    if (carried.every((line, index) => line === lines[index])) return count
  }
  return 0
}

function isBridge(previous: SubtitleCue | undefined, cue: SubtitleCue): boolean {
  if (!previous || cue.end - cue.start > BRIDGE_MAX_DURATION_SECONDS) return false
  return countCarriedLines(splitLines(previous.text), splitLines(cue.text)) === splitLines(cue.text).length
}

/** Only files full of bridge cues are rolling captions, so ordinary repeated lines stay safe */
function isRollingCaptionFile(cues: SubtitleCue[]): boolean {
  const bridges = cues.filter((cue, index) => isBridge(cues[index - 1], cue)).length
  return bridges >= MIN_BRIDGE_CUES && bridges >= cues.length * MIN_BRIDGE_RATIO
}

/**
 * YouTube auto-captions roll: every cue repeats the previous line and adds a new one.
 * Keeping only the new lines gives one clean cue per phrase.
 */
export function dedupeRollingCues(cues: SubtitleCue[]): SubtitleCue[] {
  if (!isRollingCaptionFile(cues)) return cues

  const result: SubtitleCue[] = []
  let previousRawLines: string[] = []

  for (const cue of cues) {
    const lines = splitLines(cue.text)
    const newLines = lines.slice(countCarriedLines(previousRawLines, lines))
    previousRawLines = lines

    const last = result[result.length - 1]
    if (newLines.length === 0) {
      if (last && cue.end > last.end) result[result.length - 1] = { ...last, end: cue.end }
      continue
    }
    result.push({
      start: cue.start,
      end: cue.end,
      text: newLines.join('\n'),
      // Timings of lines that were dropped are filtered out later by alignCueWords
      ...(cue.words ? { words: cue.words } : {}),
    })
  }

  return result
}
