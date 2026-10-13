/** Where the subtitle block sits on the video, and how far each language line was dragged from there. */
export type SubtitlePlacement = 'top' | 'middle' | 'bottom'
export type SubtitleLine = 'source' | 'translation'

/** Drag offset from the placement's default spot, as a % of the video size (stays valid when the video resizes) */
export interface LineOffset {
  xPercent: number
  yPercent: number
}

export interface SubtitleLayout {
  placement: SubtitlePlacement
  source: LineOffset
  translation: LineOffset
}

export const ZERO_OFFSET: LineOffset = { xPercent: 0, yPercent: 0 }
export const DEFAULT_LAYOUT: SubtitleLayout = { placement: 'bottom', source: ZERO_OFFSET, translation: ZERO_OFFSET }

const PLACEMENT_ORDER: readonly SubtitlePlacement[] = ['bottom', 'middle', 'top']
const MAX_OFFSET_PERCENT = 100

export function nextPlacement(placement: SubtitlePlacement): SubtitlePlacement {
  const index = PLACEMENT_ORDER.indexOf(placement)
  return PLACEMENT_ORDER[(index + 1) % PLACEMENT_ORDER.length] ?? 'bottom'
}

function isPlacement(value: unknown): value is SubtitlePlacement {
  return PLACEMENT_ORDER.includes(value as SubtitlePlacement)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOffsetValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_OFFSET_PERCENT
}

function normalizeOffset(value: unknown): LineOffset {
  if (!isRecord(value) || !isOffsetValue(value.xPercent) || !isOffsetValue(value.yPercent)) return ZERO_OFFSET
  return { xPercent: value.xPercent, yPercent: value.yPercent }
}

/** Storage is untrusted: repairs each field on its own so one bad value never breaks the rest */
export function normalizeLayout(raw: unknown): SubtitleLayout {
  if (!isRecord(raw)) return DEFAULT_LAYOUT
  return {
    placement: isPlacement(raw.placement) ? raw.placement : DEFAULT_LAYOUT.placement,
    source: normalizeOffset(raw.source),
    translation: normalizeOffset(raw.translation),
  }
}
