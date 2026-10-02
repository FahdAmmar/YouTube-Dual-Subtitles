import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSubtitleTrack } from './useSubtitleTrack'

const GERMAN_SRT = `1
00:00:01,000 --> 00:00:03,000
Ja, am Anfang schon.

2
00:00:04,000 --> 00:00:06,000
Das ist nicht so einfach für mich.

3
00:00:07,000 --> 00:00:09,000
Wir haben es mit ihr gemacht.
`

const ARABIC_SRT = `1
00:00:01,000 --> 00:00:03,000
نعم، في البداية.

2
00:00:04,000 --> 00:00:06,000
هذا ليس سهلاً بالنسبة لي.
`

const UNKNOWN_SRT = `1
00:00:01,000 --> 00:00:03,000
Xyzzy plugh quux.
`

describe('useSubtitleTrack language detection', () => {
  it('relabels an English-default track as German when the file is German', async () => {
    const { result } = renderHook(() => useSubtitleTrack('en', 'الإنجليزية'))
    await act(async () => {
      await result.current.uploadFile(new File([GERMAN_SRT], 'lesson.srt'))
    })
    expect(result.current.track.languageCode).toBe('de')
    expect(result.current.track.languageLabel).toBe('الألمانية')
  })

  it('relabels an Arabic file uploaded to a non-Arabic track', async () => {
    const { result } = renderHook(() => useSubtitleTrack('en', 'الإنجليزية'))
    await act(async () => {
      await result.current.uploadFile(new File([ARABIC_SRT], 'lesson.srt'))
    })
    expect(result.current.track.languageCode).toBe('ar')
  })

  it('keeps the current language when detection is inconclusive', async () => {
    const { result } = renderHook(() => useSubtitleTrack('en', 'الإنجليزية'))
    await act(async () => {
      await result.current.uploadFile(new File([UNKNOWN_SRT], 'x.srt'))
    })
    expect(result.current.track.languageCode).toBe('en')
  })

  it('detects the language for pre-split cues (bilingual upload) too', () => {
    const { result } = renderHook(() => useSubtitleTrack('en', 'الإنجليزية'))
    act(() => {
      result.current.loadCues(
        [
          { start: 1, end: 2, text: 'Ja, am Anfang schon.' },
          { start: 3, end: 4, text: 'Das ist nicht einfach für mich.' },
        ],
        'both.srt',
      )
    })
    expect(result.current.track.languageCode).toBe('de')
  })
})
