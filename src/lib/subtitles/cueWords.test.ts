import { describe, it, expect } from 'vitest'
import { parseVTT } from './parseVTT'
import { dedupeRollingCues } from './dedupeRollingCues'
import { alignCueWords } from './cueWords'
import { pairCuesIntoSlices } from './pairCues'
import { retimeCues } from './twoPointSync'
import { getActiveWordIndexAt } from './wordTiming'

const AUTO_CAPTION_VTT = `WEBVTT
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
`

describe('parseVTT word timings', () => {
  it('reads the start of every word from the inline timestamps', () => {
    const [first] = parseVTT(AUTO_CAPTION_VTT)
    expect(first!.words).toEqual([
      { text: 'Hello', start: 0 },
      { text: 'world', start: 0.5 },
    ])
  })

  it('spreads a group of words that share one timestamp until the next timestamp', () => {
    const cues = parseVTT(AUTO_CAPTION_VTT)
    const words = cues[2]!.words!
    expect(words.map((w) => w.text)).toEqual(['this', 'is', 'a', 'test'])
    expect(words[1]!.start).toBe(2.5)
    expect(words[2]!.start).toBe(3)
    // "test" falls between the start of "a" (3.0) and the end of the cue (4.0)
    expect(words[3]!.start).toBeGreaterThan(3)
    expect(words[3]!.start).toBeLessThan(4)
  })

  it('leaves plain files without word timings', () => {
    const [cue] = parseVTT('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nJust text')
    expect(cue!.words).toBeUndefined()
  })

  it('ignores styling tags that carry no time', () => {
    const [cue] = parseVTT('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<c.yellow>Styled</c> text')
    expect(cue!.text).toBe('Styled text')
    expect(cue!.words).toBeUndefined()
  })
})

describe('alignCueWords', () => {
  it('keeps timings after rolling captions are collapsed, because the carried line had none', () => {
    const cues = dedupeRollingCues(parseVTT(AUTO_CAPTION_VTT)).map(alignCueWords)
    expect(cues.map((c) => c.text)).toEqual(['Hello world', 'this is a test'])
    expect(cues[1]!.words!.map((w) => w.text)).toEqual(['this', 'is', 'a', 'test'])
  })

  it('drops timings that no longer match the text, so a wrong highlight is never shown', () => {
    const cue = alignCueWords({
      start: 0,
      end: 2,
      text: 'one two three',
      words: [
        { text: 'one', start: 0 },
        { text: 'two', start: 1 },
      ],
    })
    expect(cue.words).toBeUndefined()
  })

  it('drops timings that are not in increasing order', () => {
    const cue = alignCueWords({
      start: 0,
      end: 2,
      text: 'a b',
      words: [
        { text: 'a', start: 1 },
        { text: 'b', start: 0.5 },
      ],
    })
    expect(cue.words).toBeUndefined()
  })
})

describe('pairing keeps word timings with the right offset', () => {
  it('shifts each track words by that track own offset', () => {
    const source = [{ start: 10, end: 12, text: 'a b', words: [{ text: 'a', start: 10 }, { text: 'b', start: 11 }] }]
    // Raw 7-9 plus its offset of 5 lands on 12-14, the same moment as the source cue (10-12 plus 2)
    const translation = [{ start: 7, end: 9, text: 'x y', words: [{ text: 'x', start: 7 }, { text: 'y', start: 8 }] }]
    const [slice] = pairCuesIntoSlices(source, translation, 2, 5)
    expect(slice!.sourceWords).toEqual([{ text: 'a', start: 12 }, { text: 'b', start: 13 }])
    expect(slice!.translationWords).toEqual([{ text: 'x', start: 12 }, { text: 'y', start: 13 }])
  })

  it('leaves words out for cues that have none', () => {
    const [slice] = pairCuesIntoSlices([{ start: 0, end: 1, text: 'a' }], [], 0, 0)
    expect(slice!.sourceWords).toBeUndefined()
  })
})

describe('retimeCues keeps word timings in step', () => {
  it('maps every word through the same line as the cue itself', () => {
    const [cue] = retimeCues([{ start: 10, end: 12, text: 'a b', words: [{ text: 'a', start: 10 }, { text: 'b', start: 11 }] }], 2, 1)
    expect(cue!.words).toEqual([{ text: 'a', start: 21 }, { text: 'b', start: 23 }])
  })
})

describe('getActiveWordIndexAt', () => {
  const words = [
    { text: 'a', start: 10 },
    { text: 'b', start: 11 },
    { text: 'c', start: 12.5 },
  ]

  it('is on the first word before it starts, then follows the clock', () => {
    expect(getActiveWordIndexAt(words, 9, 14)).toBe(0)
    expect(getActiveWordIndexAt(words, 10.9, 14)).toBe(0)
    expect(getActiveWordIndexAt(words, 11, 14)).toBe(1)
    expect(getActiveWordIndexAt(words, 13, 14)).toBe(2)
  })

  it('reports every word as read once the line has ended', () => {
    expect(getActiveWordIndexAt(words, 14, 14)).toBe(3)
  })
})
