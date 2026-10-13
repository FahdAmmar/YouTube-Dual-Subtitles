import { describe, it, expect } from 'vitest'
import { getVisibleTracks, nextViewMode } from './visibleTracks'

describe('getVisibleTracks', () => {
  it.each([
    ['both', false, { source: true, translation: true }],
    ['source', false, { source: true, translation: false }],
    ['translation', false, { source: false, translation: true }],
  ] as const)('%s mode ignores the reveal flag (revealed=%s)', (mode, revealed, expected) => {
    expect(getVisibleTracks(mode, revealed)).toEqual(expected)
    expect(getVisibleTracks(mode, !revealed)).toEqual(expected)
  })

  it('recall mode keeps the source visible and hides the translation until revealed', () => {
    expect(getVisibleTracks('recall', false)).toEqual({ source: true, translation: false })
    expect(getVisibleTracks('recall', true)).toEqual({ source: true, translation: true })
  })
})

describe('nextViewMode', () => {
  it('cycles both → translation → source → both', () => {
    expect(nextViewMode('both')).toBe('translation')
    expect(nextViewMode('translation')).toBe('source')
    expect(nextViewMode('source')).toBe('both')
  })

  it('leaves recall mode for both', () => {
    expect(nextViewMode('recall')).toBe('both')
  })
})
