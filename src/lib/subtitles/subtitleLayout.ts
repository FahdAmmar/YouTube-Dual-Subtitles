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

/**
 * The font sizes in Settings are pixels, which suit a normal desktop player but fill most of a phone-sized video.
 * Between these two stage widths the chosen size is used as is, so desktop layouts look exactly as before.
 */
const COMFORT_MIN_STAGE_WIDTH = 640
const COMFORT_MAX_STAGE_WIDTH = 1000
const MIN_FONT_SCALE = 0.65
const MAX_FONT_SCALE = 1.5

/** Multiplier for the chosen subtitle font size, from the width of the video stage in CSS pixels */
export function getSubtitleFontScale(stageWidth: number): number {
  if (!Number.isFinite(stageWidth) || stageWidth <= 0) return 1
  if (stageWidth < COMFORT_MIN_STAGE_WIDTH) return Math.max(MIN_FONT_SCALE, stageWidth / COMFORT_MIN_STAGE_WIDTH)
  if (stageWidth > COMFORT_MAX_STAGE_WIDTH) return Math.min(MAX_FONT_SCALE, stageWidth / COMFORT_MAX_STAGE_WIDTH)
  return 1
}
