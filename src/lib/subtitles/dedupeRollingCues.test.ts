import { describe, it, expect } from 'vitest'
import { dedupeRollingCues } from './dedupeRollingCues'
import { parseVTT } from './parseVTT'

const ROLLING_VTT = `WEBVTT
Kind: captions

00:00:00.000 --> 00:00:02.000 align:start position:0%
Hello<00:00:00.500><c> world</c>

00:00:02.000 --> 00:00:02.010 align:start position:0%
Hello world

00:00:02.010 --> 00:00:04.000 align:start position:0%
Hello world
this<00:00:02.500><c> is</c><00:00:03.000><c> a test</c>

00:00:04.000 --> 00:00:04.010 align:start position:0%
Hello world
this is a test

00:00:04.010 --> 00:00:06.000 align:start position:0%
this is a test
and a new line
`

describe('dedupeRollingCues', () => {
  it('collapses YouTube rolling auto-captions into one clean cue per phrase', () => {
    const cues = dedupeRollingCues(parseVTT(ROLLING_VTT))
    expect(cues.map((cue) => cue.text)).toEqual(['Hello world', 'this is a test', 'and a new line'])
  })

  it('keeps timing contiguous so no scene is lost', () => {
    const cues = dedupeRollingCues(parseVTT(ROLLING_VTT))
    expect(cues[0]).toMatchObject({ start: 0 })
    expect(cues[1]).toMatchObject({ start: 2.01, end: 4.01 })
    expect(cues[2]).toMatchObject({ end: 6 })
  })

  it('leaves ordinary subtitles untouched, even with repeated lines', () => {
    const ordinary = [
      { start: 0, end: 2, text: 'No.' },
      { start: 2, end: 4, text: 'No.' },
      { start: 4, end: 6, text: 'Fine, then.' },
    ]
    expect(dedupeRollingCues(ordinary)).toEqual(ordinary)
  })

  it('returns an empty array for no cues', () => {
    expect(dedupeRollingCues([])).toEqual([])
  })
})
