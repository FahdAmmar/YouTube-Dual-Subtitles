import { describe, it, expect } from 'vitest'
import { computeTwoPointSync, retimeCues, toSyncedFileName, MIN_ANCHOR_GAP_SECONDS } from './twoPointSync'

describe('computeTwoPointSync', () => {
  it('finds a plain shift when both anchors are off by the same amount', () => {
    const result = computeTwoPointSync({ cueTime: 10, videoTime: 12 }, { cueTime: 3000, videoTime: 3002 })
    expect(result).toMatchObject({ ok: true })
    if (result.ok) {
      expect(result.scale).toBeCloseTo(1, 6)
      expect(result.offset).toBeCloseTo(2, 6)
    }
  })

  it('finds the stretch for a frame-rate mismatch (23.976 vs 25 fps files)', () => {
    const ratio = 25 / 23.976
    const result = computeTwoPointSync({ cueTime: 60, videoTime: 60 * ratio }, { cueTime: 5400, videoTime: 5400 * ratio })
    expect(result.ok && result.scale).toBeCloseTo(ratio, 6)
    expect(result.ok && result.offset).toBeCloseTo(0, 4)
  })

  it('accepts the anchors in either order', () => {
    const forward = computeTwoPointSync({ cueTime: 10, videoTime: 12 }, { cueTime: 1010, videoTime: 1022 })
    const backward = computeTwoPointSync({ cueTime: 1010, videoTime: 1022 }, { cueTime: 10, videoTime: 12 })
    expect(backward).toEqual(forward)
  })

  it('refuses anchors that are too close, where a tiny error would stretch the whole file', () => {
    const result = computeTwoPointSync({ cueTime: 100, videoTime: 100 }, { cueTime: 100 + MIN_ANCHOR_GAP_SECONDS - 1, videoTime: 140 })
    expect(result).toEqual({ ok: false, reason: 'too-close' })
  })

  it('refuses a result that would stretch the subtitles unrealistically', () => {
    expect(computeTwoPointSync({ cueTime: 10, videoTime: 10 }, { cueTime: 1010, videoTime: 3010 })).toEqual({
      ok: false,
      reason: 'implausible',
    })
  })

  it('refuses anchors that put the later cue earlier in the video', () => {
    expect(computeTwoPointSync({ cueTime: 10, videoTime: 500 }, { cueTime: 1010, videoTime: 20 })).toEqual({
      ok: false,
      reason: 'implausible',
    })
  })
})

describe('retimeCues', () => {
  const cues = [
    { start: 10, end: 12, text: 'a' },
    { start: 20, end: 24, text: 'b' },
  ]

  it('applies scale then offset to both ends of every cue, keeping the text', () => {
    expect(retimeCues(cues, 2, 1)).toEqual([
      { start: 21, end: 25, text: 'a' },
      { start: 41, end: 49, text: 'b' },
    ])
  })

  it('drops cues that end up before the start of the video and clamps the first partially', () => {
    const shifted = retimeCues(cues, 1, -11)
    expect(shifted).toEqual([
      { start: 0, end: 1, text: 'a' },
      { start: 9, end: 13, text: 'b' },
    ])
    expect(retimeCues(cues, 1, -30)).toEqual([])
  })

  it('rounds to milliseconds so floating point noise never reaches the saved file', () => {
    const [cue] = retimeCues([{ start: 1, end: 2, text: 'x' }], 1 / 3, 0)
    expect(cue).toEqual({ start: 0.333, end: 0.667, text: 'x' })
  })

  it('does not modify the original cues', () => {
    retimeCues(cues, 2, 1)
    expect(cues[0]).toEqual({ start: 10, end: 12, text: 'a' })
  })
})

describe('toSyncedFileName', () => {
  it.each([
    ['movie.srt', 'movie.synced.srt'],
    ['movie.en.vtt', 'movie.en.synced.srt'],
    ['movie.en.synced.srt', 'movie.en.synced.srt'],
    ['noextension', 'noextension.synced.srt'],
  ])('%s -> %s', (input, expected) => {
    expect(toSyncedFileName(input)).toBe(expected)
  })
})
