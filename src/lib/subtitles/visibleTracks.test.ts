import { describe, it, expect } from 'vitest'
import { getVisibleTracks } from './visibleTracks'

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
