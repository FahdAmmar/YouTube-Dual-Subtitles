import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { LazyMotion, domAnimation } from 'framer-motion'
import { SubtitleSettingsProvider } from '@/context/SubtitleSettingsContext'
import { SubtitleOverlay } from '@/components/video/SubtitleOverlay'
import { DEFAULT_LAYOUT } from '@/lib/subtitles/subtitleLayout'
import type { SubtitleTrackState } from '@/types/subtitle.types'

const TRANSLATION_FONT_SIZE = 26
const SOURCE_FONT_SIZE = 20
const SOURCE_LINE_RATIO = 0.85

function makeTrack(text: string, languageCode: string): SubtitleTrackState {
  return {
    languageLabel: languageCode,
    languageCode,
    fileName: `${languageCode}.srt`,
    cues: [{ start: 0, end: 10, text }],
    status: 'ready',
    errorMessage: null,
    syncOffsetSeconds: 0,
  }
}

type ObserverCallback = () => void
let observerCallbacks: ObserverCallback[] = []
let stageWidth = 800

class ControllableResizeObserver {
  constructor(callback: ObserverCallback) {
    observerCallbacks.push(callback)
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderOverlay() {
  const stage = document.createElement('div')
  document.body.append(stage)
  return render(
    <LazyMotion features={domAnimation} strict>
      <SubtitleSettingsProvider>
        <SubtitleOverlay
          sourceTrack={makeTrack('مرحبا بكم', 'ar')}
          translationTrack={makeTrack('Welcome everyone', 'en')}
          getCurrentTime={() => 2}
          viewMode="both"
          slices={[]}
          revealedIndex={null}
          onToggleReveal={() => {}}
          stageRef={{ current: stage }}
          layout={DEFAULT_LAYOUT}
          onLineOffsetChange={() => {}}
          onWordSelect={() => {}}
        />
      </SubtitleSettingsProvider>
    </LazyMotion>,
  )
}

async function readFontSizes(): Promise<{ translation: number; source: number }> {
  const translationBox = await screen.findByTestId('subtitle-line-translation')
  const sourceBox = screen.getByTestId('subtitle-line-source')
  const translationLine = translationBox.getElementsByTagName('p')[0]
  const sourceLine = sourceBox.getElementsByTagName('p')[0]
  return {
    translation: parseFloat(translationLine?.style.fontSize ?? ''),
    source: parseFloat(sourceLine?.style.fontSize ?? ''),
  }
}

describe('subtitle text scales with the video stage', () => {
  const originalObserver = window.ResizeObserver

  beforeEach(() => {
    observerCallbacks = []
    stageWidth = 800
    window.localStorage.clear()
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => stageWidth)
    window.ResizeObserver = ControllableResizeObserver as unknown as typeof ResizeObserver
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.ResizeObserver = originalObserver
  })

  it('keeps the chosen sizes on a normal desktop-sized video', async () => {
    renderOverlay()
    const sizes = await readFontSizes()
    expect(sizes.translation).toBeCloseTo(TRANSLATION_FONT_SIZE)
    expect(sizes.source).toBeCloseTo(SOURCE_FONT_SIZE * SOURCE_LINE_RATIO)
  })

  it('shrinks both lines on a phone-sized video so a long line does not fill it', async () => {
    stageWidth = 360
    renderOverlay()
    const sizes = await readFontSizes()
    expect(sizes.translation).toBeCloseTo(TRANSLATION_FONT_SIZE * 0.65)
    expect(sizes.source).toBeCloseTo(SOURCE_FONT_SIZE * SOURCE_LINE_RATIO * 0.65)
  })

  it('follows the stage when it is resized (rotation, sidebar drag, fullscreen)', async () => {
    renderOverlay()
    expect((await readFontSizes()).translation).toBeCloseTo(TRANSLATION_FONT_SIZE)

    stageWidth = 1920
    act(() => observerCallbacks.forEach((callback) => callback()))

    expect((await readFontSizes()).translation).toBeCloseTo(TRANSLATION_FONT_SIZE * 1.5)
  })

  it('keeps the chosen sizes when the browser cannot report the stage width', async () => {
    stageWidth = 0
    renderOverlay()
    expect((await readFontSizes()).translation).toBeCloseTo(TRANSLATION_FONT_SIZE)
  })
})
