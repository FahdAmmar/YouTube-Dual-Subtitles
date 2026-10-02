export const DOUBLE_TAP_WINDOW_MS = 300
/** Seconds skipped by each double tap on the left or right side */
export const DOUBLE_TAP_SEEK_SECONDS = 10

const TAP_MAX_MOVE_PX = 10
const TAP_MAX_DURATION_MS = 500
const SWIPE_MIN_DISTANCE_PX = 60
const SWIPE_MAX_DURATION_MS = 600
// Horizontal travel must clearly dominate, so a diagonal scroll never counts as a swipe
const SWIPE_DOMINANCE_RATIO = 2

export type TapZone = 'left' | 'center' | 'right'
export type ReleaseKind = 'tap' | 'swipe-left' | 'swipe-right' | 'none'

export interface PointerSample {
  x: number
  y: number
  time: number
}

/** Thirds of the stage; the physical left/right, not tied to the page direction */
export function getTapZone(x: number, width: number): TapZone {
  if (width <= 0) return 'center'
  const ratio = x / width
  if (ratio < 1 / 3) return 'left'
  if (ratio >= 2 / 3) return 'right'
  return 'center'
}

export function classifyRelease(start: PointerSample, end: PointerSample): ReleaseKind {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const duration = end.time - start.time

  if (Math.hypot(dx, dy) <= TAP_MAX_MOVE_PX) {
    return duration <= TAP_MAX_DURATION_MS ? 'tap' : 'none'
  }

  const isFastEnough = duration <= SWIPE_MAX_DURATION_MS
  const isFarEnough = Math.abs(dx) >= SWIPE_MIN_DISTANCE_PX
  const isHorizontal = Math.abs(dx) >= Math.abs(dy) * SWIPE_DOMINANCE_RATIO
  if (!isFastEnough || !isFarEnough || !isHorizontal) return 'none'
  return dx < 0 ? 'swipe-left' : 'swipe-right'
}
