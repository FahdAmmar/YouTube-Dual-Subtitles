import { Profiler, type ProfilerOnRenderCallback } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { LazyMotion, domAnimation } from 'framer-motion'
import { SubtitleSettingsProvider } from '@/context/SubtitleSettingsContext'
import { SubtitleOverlay } from '@/components/video/SubtitleOverlay'
import { MobileActiveCaption } from '@/components/video/MobileActiveCaption'
import { TranscriptList } from '@/components/console/TranscriptList'
import { DEFAULT_LAYOUT } from '@/lib/subtitles/subtitleLayout'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { SubtitleTrackState } from '@/types/subtitle.types'

/**
 * The player clock ticks 5 times a second. A component that only shows "the cue playing now" must not re-render on
 * every tick, only when the cue itself changes. Counts, never timings, so the test is deterministic.
 */
let time = 1
const getCurrentTime = () => time
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
/** Moves the clock and waits for more than one poll interval (200 ms) so the tick is seen */
const advanceTo = async (next: number) => {
  time = next
  await act(async () => {
    await sleep(260)
  })
}

beforeEach(() => {
  time = 1
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => vi.unstubAllGlobals())

const track = (text: string, code: string): SubtitleTrackState => ({
  languageLabel: code,
  languageCode: code,
  fileName: `${code}.srt`,
  cues: [
    { start: 0, end: 10, text: `${text} 1` },
    { start: 10, end: 20, text: `${text} 2` },
  ],
  status: 'ready',
  errorMessage: null,
  syncOffsetSeconds: 0,
})

const slices: PairedSlice[] = [
  { id: 'a', originalIndex: 0, start: 0, end: 10, sourceText: 'Satz eins', translationText: 'الجملة الأولى' },
  { id: 'b', originalIndex: 1, start: 10, end: 20, sourceText: 'Satz zwei', translationText: 'الجملة الثانية' },
]

describe('components that show the active cue', () => {
  it('SubtitleOverlay re-renders only when the cue changes, not on every clock tick', async () => {
    const stage = document.createElement('div')
    document.body.append(stage)
    const onRender = vi.fn<ProfilerOnRenderCallback>()
    render(
      <LazyMotion features={domAnimation} strict>
        <SubtitleSettingsProvider>
          <Profiler id="overlay" onRender={onRender}>
            <SubtitleOverlay
              sourceTrack={track('مرحبا', 'ar')}
              translationTrack={track('Hello', 'en')}
              getCurrentTime={getCurrentTime}
              viewMode="both"
              slices={slices}
              revealedIndex={null}
              onToggleReveal={() => {}}
              stageRef={{ current: stage }}
              layout={DEFAULT_LAYOUT}
              onLineOffsetChange={() => {}}
              onWordSelect={() => {}}
            />
          </Profiler>
        </SubtitleSettingsProvider>
      </LazyMotion>,
    )
    // The translation is rendered as one button per word, so read the whole line instead of matching one text node
    expect(await screen.findByTestId('subtitle-line-translation')).toHaveTextContent('Hello 1')

    onRender.mockClear()
    for (const next of [2, 3.5, 5, 7.5, 9]) await advanceTo(next) // five ticks, all inside the first cue
    expect(onRender).not.toHaveBeenCalled()

    await advanceTo(12) // the second cue starts
    // The line animates out and in, so the new text arrives a moment after the cue changes
    await waitFor(() => expect(screen.getByTestId('subtitle-line-translation')).toHaveTextContent('Hello 2'))
    expect(onRender).toHaveBeenCalled()
  })

  it('MobileActiveCaption re-renders only when the cue changes', async () => {
    const onRender = vi.fn<ProfilerOnRenderCallback>()
    render(
      <Profiler id="caption" onRender={onRender}>
        <MobileActiveCaption
          slices={slices}
          getCurrentTime={getCurrentTime}
          viewMode="both"
          revealedIndex={null}
          onToggleReveal={() => {}}
        />
      </Profiler>,
    )
    expect(screen.getByText('الجملة الأولى')).toBeInTheDocument()

    onRender.mockClear()
    for (const next of [2, 3.5, 5, 7.5, 9]) await advanceTo(next)
    expect(onRender).not.toHaveBeenCalled()

    await advanceTo(12)
    expect(screen.getByText('الجملة الثانية')).toBeInTheDocument()
  })

  it('TranscriptList does not walk its cards on every tick, only when the cue changes', async () => {
    // SliceCard is memoised, so a call to `has` happens only when the list itself re-renders (once per visible card)
    class CountingSet extends Set<string> {
      calls = 0
      override has(value: string) {
        this.calls++
        return super.has(value)
      }
    }
    const bookmarkedIds = new CountingSet()
    render(
      <TranscriptList
        slices={slices}
        getCurrentTime={getCurrentTime}
        viewMode="both"
        revealedIndex={null}
        bookmarkedIds={bookmarkedIds}
        onToggleBookmark={() => {}}
        onSeek={() => {}}
      />,
    )

    bookmarkedIds.calls = 0
    for (const next of [2, 3.5, 5, 7.5, 9]) await advanceTo(next)
    expect(bookmarkedIds.calls).toBe(0)

    await advanceTo(12)
    expect(bookmarkedIds.calls).toBeGreaterThan(0)
  })

  it('keeps the progress bar of the active card moving between cue changes', async () => {
    render(
      <TranscriptList
        slices={slices}
        getCurrentTime={getCurrentTime}
        viewMode="both"
        revealedIndex={null}
        bookmarkedIds={new Set()}
        onToggleBookmark={() => {}}
        onSeek={() => {}}
      />,
    )
    const percent = () => Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'))
    const before = percent()
    await advanceTo(5)
    expect(percent()).toBeGreaterThan(before)
    expect(percent()).toBe(50)
  })
})
