import type { SubtitleCue } from '@/types/subtitle.types'

/** Anchors closer than this make the stretch factor too sensitive to small timing mistakes */
export const MIN_ANCHOR_GAP_SECONDS = 30
/** Real mismatches (23.976 vs 25 fps, PAL speed-up) stay inside this range; anything else is a wrong anchor */
export const MIN_SCALE = 0.8
export const MAX_SCALE = 1.25

export interface SyncAnchor {
  /** Where the line is in the subtitle file */
  cueTime: number
  /** Where the line is actually spoken in the video */
  videoTime: number
}

export type TwoPointSyncResult =
  | { ok: true; scale: number; offset: number }
  | { ok: false; reason: 'too-close' | 'implausible' }

/**
 * A constant shift cannot fix subtitles that drift (different frame rate or cut).
 * Two matched points give a line: videoTime = scale * cueTime + offset.
 */
export function computeTwoPointSync(first: SyncAnchor, second: SyncAnchor): TwoPointSyncResult {
  const [early, late] = first.cueTime <= second.cueTime ? [first, second] : [second, first]
  if (late.cueTime - early.cueTime < MIN_ANCHOR_GAP_SECONDS) return { ok: false, reason: 'too-close' }

  const scale = (late.videoTime - early.videoTime) / (late.cueTime - early.cueTime)
  if (!Number.isFinite(scale) || scale < MIN_SCALE || scale > MAX_SCALE) return { ok: false, reason: 'implausible' }

  return { ok: true, scale, offset: early.videoTime - scale * early.cueTime }
}

const toMilliseconds = (seconds: number): number => Math.round(seconds * 1000) / 1000

/** Returns new cues mapped onto the video's timeline; cues that end before the video starts are dropped */
export function retimeCues(cues: SubtitleCue[], scale: number, offset: number): SubtitleCue[] {
  const result: SubtitleCue[] = []
  for (const cue of cues) {
    const end = toMilliseconds(scale * cue.end + offset)
    if (end <= 0) continue
    result.push({
      ...cue,
      start: Math.max(0, toMilliseconds(scale * cue.start + offset)),
      end,
      ...(cue.words
        ? { words: cue.words.map((word) => ({ text: word.text, start: toMilliseconds(scale * word.start + offset) })) }
        : {}),
    })
  }
  return result
}

/** "movie.en.srt" and its already-synced "movie.en.synced.srt" both become "movie.en.synced.srt" */
export function toSyncedFileName(fileName: string): string {
  return `${fileName.replace(/(\.synced)?\.[^./\\]+$/, '')}.synced.srt`
}
