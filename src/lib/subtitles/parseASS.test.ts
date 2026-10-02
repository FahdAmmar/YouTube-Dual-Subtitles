import { describe, it, expect } from 'vitest'
import { parseASS } from './parseASS'

const ASS_HEADER = `[Script Info]
Title: Test
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize
Style: Default,Arial,20

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`

const ass = (...lines: string[]) => ASS_HEADER + lines.join('\n') + '\n'

describe('parseASS', () => {
  it('reads start, end and text from Dialogue lines', () => {
    const cues = parseASS(ass('Dialogue: 0,0:00:01.00,0:00:04.50,Default,,0,0,0,,Hello world'))
    expect(cues).toEqual([{ start: 1, end: 4.5, text: 'Hello world' }])
  })

  it('converts the H:MM:SS.cc clock, including hours and centiseconds', () => {
    const [cue] = parseASS(ass('Dialogue: 0,1:02:03.04,1:02:05.50,Default,,0,0,0,,x'))
    expect(cue?.start).toBeCloseTo(3723.04, 5)
    expect(cue?.end).toBeCloseTo(3725.5, 5)
  })

  it('keeps commas inside the text', () => {
    const [cue] = parseASS(ass('Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,Well, no, really, no'))
    expect(cue?.text).toBe('Well, no, really, no')
  })

  it('follows the column order declared by the Format line', () => {
    const content = `[Events]
Format: Style, Start, End, Text
Dialogue: Default,0:00:01.00,0:00:02.00,Reordered
`
    expect(parseASS(content)).toEqual([{ start: 1, end: 2, text: 'Reordered' }])
  })

  it('reads old SSA files, whose first column is Marked instead of Layer', () => {
    const content = `[Script Info]
ScriptType: v4.00

[V4 Styles]
Format: Name, Fontname

[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: Marked=0,0:00:01.00,0:00:02.00,Default,,0,0,0,,Old school
`
    expect(parseASS(content)).toEqual([{ start: 1, end: 2, text: 'Old school' }])
  })

  it('falls back to the standard column layout when there is no Format line', () => {
    const content = `[Events]
Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,No format line
`
    expect(parseASS(content)).toEqual([{ start: 1, end: 2, text: 'No format line' }])
  })

  describe('text cleanup', () => {
    const textOf = (raw: string) => parseASS(ass(`Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,${raw}`))[0]?.text

    it('removes override tag blocks', () => {
      expect(textOf('{\\an8}{\\i1}Hello{\\i0} there')).toBe('Hello there')
      expect(textOf('{\\pos(100,200)\\fad(200,200)}Positioned')).toBe('Positioned')
      expect(textOf('{\\k20}Ka{\\k30}ra{\\k10}oke')).toBe('Karaoke')
    })

    it('turns \\N into a line break, and \\n and \\h into spaces', () => {
      expect(textOf('First\\NSecond')).toBe('First\nSecond')
      expect(textOf('One\\nTwo')).toBe('One Two')
      expect(textOf('A\\hB')).toBe('A B')
    })

    it('leaves an unclosed brace as plain text instead of swallowing the line', () => {
      expect(textOf('Use { carefully')).toBe('Use { carefully')
    })

    it('trims surrounding whitespace', () => {
      expect(textOf('  padded  ')).toBe('padded')
    })
  })

  describe('lines that are not subtitles', () => {
    const one = (line: string) => parseASS(ass(line))

    it('skips vector drawings used for typesetting', () => {
      expect(one('Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{\\p1}m 0 0 l 100 0 100 100{\\p0}')).toEqual([])
      expect(one('Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{\\an7\\p2}m 0 0 l 5 5')).toEqual([])
    })

    it('keeps text from a drawing-mode switch that is turned off', () => {
      expect(one('Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{\\p0}Real text')).toHaveLength(1)
    })

    it('skips Comment lines', () => {
      expect(one('Comment: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,Translator note')).toEqual([])
    })

    it.each([
      ['an empty text', 'Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,'],
      ['text that is only tags', 'Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{\\an8}'],
      ['an end before the start', 'Dialogue: 0,0:00:05.00,0:00:02.00,Default,,0,0,0,,Backwards'],
      ['a zero duration', 'Dialogue: 0,0:00:02.00,0:00:02.00,Default,,0,0,0,,Instant'],
      ['an unreadable time', 'Dialogue: 0,soon,later,Default,,0,0,0,,Oops'],
      ['too few columns', 'Dialogue: 0,0:00:01.00'],
    ])('skips %s', (_label, line) => {
      expect(one(line)).toEqual([])
    })

    it('ignores Dialogue lines outside the Events section', () => {
      const content = `[Script Info]
Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,Not an event

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:03.00,0:00:04.00,Default,,0,0,0,,Real
`
      expect(parseASS(content)).toEqual([{ start: 3, end: 4, text: 'Real' }])
    })

    it('stops reading events when a later section begins', () => {
      const content = ass('Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,Kept') +
        '\n[Fonts]\nDialogue: 0,0:00:05.00,0:00:06.00,Default,,0,0,0,,Ignored\n'
      expect(parseASS(content).map((cue) => cue.text)).toEqual(['Kept'])
    })
  })

  it('returns cues sorted by start time', () => {
    const cues = parseASS(
      ass(
        'Dialogue: 0,0:00:09.00,0:00:10.00,Default,,0,0,0,,Late',
        'Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,Early',
      ),
    )
    expect(cues.map((cue) => cue.text)).toEqual(['Early', 'Late'])
  })

  it('handles Windows line endings and a byte order mark', () => {
    const content = '\uFEFF' + ass('Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,CRLF').replace(/\n/g, '\r\n')
    expect(parseASS(content)).toEqual([{ start: 1, end: 2, text: 'CRLF' }])
  })

  it('reads Arabic and other non-Latin text unchanged', () => {
    const [cue] = parseASS(ass('Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{\\an2}مرحباً\\Nبكم'))
    expect(cue?.text).toBe('مرحباً\nبكم')
  })

  it('stays fast on a large file full of tags', () => {
    const lines = Array.from(
      { length: 20000 },
      (_, i) => `Dialogue: 0,0:00:${String(i % 60).padStart(2, '0')}.00,1:00:00.00,Default,,0,0,0,,{\\an8}{\\b1}line ${i}{\\b0}`,
    )
    expect(parseASS(ass(...lines))).toHaveLength(20000)
  })

  it('returns nothing for a file with no events', () => {
    expect(parseASS('[Script Info]\nTitle: empty\n')).toEqual([])
  })
})
