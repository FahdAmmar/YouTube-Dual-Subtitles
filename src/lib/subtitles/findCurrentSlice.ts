import type { PairedSlice } from './pairCues'

export interface CurrentSlice {
  /** The slice playing now, or the last one that started; -1 before the first slice */
  index: number
  /** False in a gap between two slices, when `index` points to the one just finished */
  isActive: boolean
}

/**
 * Unlike findActiveCue this never loses its place in a gap between cues,
 * so a reading view can keep the last line anchored instead of jumping away.
 */
export function findCurrentSlice(slices: PairedSlice[], currentTime: number): CurrentSlice {
  let low = 0
  let high = slices.length - 1
  let index = -1

  while (low <= high) {
    const mid = (low + high) >> 1
    if (slices[mid]!.start <= currentTime) {
      index = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return { index, isActive: index >= 0 && currentTime < slices[index]!.end }
}
