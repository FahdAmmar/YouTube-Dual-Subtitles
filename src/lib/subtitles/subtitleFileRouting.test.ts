import { describe, it, expect } from 'vitest'
import { assignFilesToTracks, filterSubtitleFiles, textToSubtitleFile } from './subtitleFileRouting'

const file = (name: string) => new File(['x'], name)

describe('filterSubtitleFiles', () => {
  it('keeps subtitle formats in any letter case and drops everything else', () => {
    const kept = filterSubtitleFiles([file('a.srt'), file('b.VTT'), file('c.ass'), file('d.png'), file('e.txt')])
    expect(kept.map((f) => f.name)).toEqual(['a.srt', 'b.VTT', 'c.ass'])
  })
})

describe('assignFilesToTracks', () => {
  const [one, two, three] = [file('1.srt'), file('2.srt'), file('3.srt')]

  it('sends a single file to the source track when it is empty', () => {
    expect(assignFilesToTracks([one], false)).toEqual({ source: one })
  })

  it('sends a single file to the translation track once the source is loaded', () => {
    expect(assignFilesToTracks([one], true)).toEqual({ translation: one })
  })

  it('maps two files to source then translation and ignores extras', () => {
    expect(assignFilesToTracks([one, two, three], false)).toEqual({ source: one, translation: two })
  })

  it('returns nothing for no files', () => {
    expect(assignFilesToTracks([], false)).toEqual({})
  })
})

describe('textToSubtitleFile', () => {
  it('turns pasted SRT text into a file', async () => {
    const srt = '1\n00:00:01,000 --> 00:00:02,000\nHello'
    const result = textToSubtitleFile(srt)
    expect(result?.name).toBe('pasted.srt')
    expect(await result?.text()).toBe(srt)
  })

  it('recognises pasted WebVTT', () => {
    expect(textToSubtitleFile('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi')?.name).toBe('pasted.vtt')
  })

  it('ignores ordinary pasted text', () => {
    expect(textToSubtitleFile('just a sentence')).toBeNull()
    expect(textToSubtitleFile('')).toBeNull()
  })
})
