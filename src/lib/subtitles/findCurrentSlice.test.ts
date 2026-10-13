import { describe, it, expect } from 'vitest'
import { findCurrentSlice } from './findCurrentSlice'
import type { PairedSlice } from './pairCues'

const slice = (index: number, start: number, end: number): PairedSlice => ({
  id: `slice-${index}`,
  originalIndex: index,
  start,
  end,
  sourceText: `s${index}`,
  translationText: null,
})
const slices = [slice(0, 1, 3), slice(1, 5, 7), slice(2, 7, 9)]

describe('findCurrentSlice', () => {
  it('returns -1 before the first slice', () => {
    expect(findCurrentSlice(slices, 0.5)).toEqual({ index: -1, isActive: false })
  })

  it('returns the active slice', () => {
    expect(findCurrentSlice(slices, 6)).toEqual({ index: 1, isActive: true })
  })

  it('keeps the last slice during a gap, flagged as inactive', () => {
    expect(findCurrentSlice(slices, 4)).toEqual({ index: 0, isActive: false })
  })

  it('stays on the final slice after the end', () => {
    expect(findCurrentSlice(slices, 100)).toEqual({ index: 2, isActive: false })
  })

  it('handles an empty list', () => {
    expect(findCurrentSlice([], 3)).toEqual({ index: -1, isActive: false })
  })
})
