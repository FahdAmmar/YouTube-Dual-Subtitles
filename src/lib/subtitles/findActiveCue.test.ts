import { describe, expect, it } from 'vitest'
import { findActiveCue } from './findActiveCue'
import { parseSRT } from './parseSRT'

interface Item {
  start: number
  end: number
  id: string
}

const item = (id: string, start: number, end: number): Item => ({ id, start, end })

/** The obvious O(n) answer: the latest-starting item that covers the time */
function reference(items: Item[], time: number): Item | null {
  let found: Item | null = null
  for (const entry of items) if (entry.start <= time && time < entry.end) found = entry
  return found
}

describe('findActiveCue', () => {
  it('returns the cue that covers the time and null in a gap', () => {
    const cues = [item('a', 0, 2), item('b', 3, 5)]
    expect(findActiveCue(cues, 1)?.id).toBe('a')
    expect(findActiveCue(cues, 2.5)).toBeNull()
    expect(findActiveCue(cues, 4)?.id).toBe('b')
  })

  it('treats the end as exclusive and the start as inclusive', () => {
    const cues = [item('a', 0, 2), item('b', 2, 4)]
    expect(findActiveCue(cues, 2)?.id).toBe('b')
    expect(findActiveCue(cues, 4)).toBeNull()
  })

  it('returns null before the first cue, after the last one and for an empty list', () => {
    const cues = [item('a', 5, 6)]
    expect(findActiveCue(cues, 1)).toBeNull()
    expect(findActiveCue(cues, 9)).toBeNull()
    expect(findActiveCue([], 1)).toBeNull()
  })

  it('keeps a long cue visible while a shorter cue inside it starts and ends', () => {
    const cues = [item('long', 0, 10), item('short', 2, 4), item('later', 6, 8)]
    expect(findActiveCue(cues, 1)?.id).toBe('long')
    expect(findActiveCue(cues, 3)?.id).toBe('short')
    // Regression: these two used to return null while "long" was still on screen
    expect(findActiveCue(cues, 5)?.id).toBe('long')
    expect(findActiveCue(cues, 9)?.id).toBe('long')
    expect(findActiveCue(cues, 10)).toBeNull()
  })

  it('finds the overlapped cue in a file that goes through the real SRT parser', () => {
    const srt = [
      '1\n00:00:00,000 --> 00:00:10,000\nNarrator speaks for a long time',
      '2\n00:00:02,000 --> 00:00:04,000\n[door slams]',
      '3\n00:00:06,000 --> 00:00:08,000\nAnother line',
    ].join('\n\n')
    const cues = parseSRT(srt)
    expect(findActiveCue(cues, 5)?.text).toBe('Narrator speaks for a long time')
    expect(findActiveCue(cues, 7)?.text).toBe('Another line')
    expect(findActiveCue(cues, 9)?.text).toBe('Narrator speaks for a long time')
  })

  it('agrees with a linear scan on randomly overlapping cues', () => {
    // A small deterministic generator keeps the test reproducible
    let seed = 12345
    const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
    const cues = Array.from({ length: 300 }, (_, index) => {
      const start = Math.floor(random() * 600) / 2
      return item(`c${index}`, start, start + 0.5 + Math.floor(random() * 40) / 2)
    }).sort((a, b) => a.start - b.start)

    for (let time = -1; time < 340; time += 0.25) {
      expect(findActiveCue(cues, time)?.id ?? null).toBe(reference(cues, time)?.id ?? null)
    }
  })

  it('does not reuse stale data when a new array is passed', () => {
    const first = [item('a', 0, 10)]
    expect(findActiveCue(first, 5)?.id).toBe('a')
    const second = [item('b', 0, 1), item('c', 4, 6)]
    expect(findActiveCue(second, 5)?.id).toBe('c')
  })
})
