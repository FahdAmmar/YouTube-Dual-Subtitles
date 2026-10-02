import { describe, it, expect } from 'vitest'
import { parseSubtitleFile, SubtitleParseError, MAX_FILE_SIZE_BYTES } from './parseSubtitleFile'

const ASS = `[Script Info]
ScriptType: v4.00+

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,From ASS
`
const SRT = `1
00:00:01,000 --> 00:00:02,000
From SRT
`
const VTT = `WEBVTT

00:00:01.000 --> 00:00:02.000
From VTT
`

const file = (name: string, content: string) => new File([content], name, { type: 'text/plain' })

describe('parseSubtitleFile', () => {
  it.each([
    ['movie.srt', SRT, 'From SRT'],
    ['movie.vtt', VTT, 'From VTT'],
    ['movie.ass', ASS, 'From ASS'],
    ['movie.ssa', ASS, 'From ASS'],
    ['MOVIE.ASS', ASS, 'From ASS'],
  ])('reads %s by its extension', async (name, content, expectedText) => {
    const cues = await parseSubtitleFile(file(name, content))
    expect(cues).toEqual([{ start: 1, end: 2, text: expectedText }])
  })

  it('names ASS and SSA among the supported formats when rejecting an extension', async () => {
    await expect(parseSubtitleFile(file('movie.txt', SRT))).rejects.toThrow(/ASS/)
  })

  it('rejects an oversized file before reading it', async () => {
    const huge = file('big.ass', ASS)
    Object.defineProperty(huge, 'size', { value: MAX_FILE_SIZE_BYTES + 1 })
    await expect(parseSubtitleFile(huge)).rejects.toThrow(SubtitleParseError)
  })

  it('rejects an empty file', async () => {
    await expect(parseSubtitleFile(file('empty.ass', '  \n'))).rejects.toThrow('الملف فارغ')
  })

  it('explains when an ASS file holds no usable lines', async () => {
    await expect(parseSubtitleFile(file('none.ass', '[Script Info]\nTitle: x\n'))).rejects.toThrow(/مقطع ترجمة صالح/)
  })
})
