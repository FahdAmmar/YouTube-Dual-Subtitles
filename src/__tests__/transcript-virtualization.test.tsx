import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import { TranscriptList } from '@/components/console/TranscriptList'
import type { PairedSlice } from '@/lib/subtitles/pairCues'

/**
 * Guards the rule in .claude/rules/performance.md: a list that can grow to hundreds of items is virtualised.
 * Measured before the change (jsdom, 3000 slices): 81,003 DOM nodes. After: 508, whatever the length.
 * Only deterministic things are asserted (counts and calls), never timings.
 */
const makeSlices = (count: number): PairedSlice[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `slice-${index}`,
    originalIndex: index,
    start: index * 2,
    end: index * 2 + 1.8,
    sourceText: `Das ist der Satz Nummer ${index}`,
    translationText: `الجملة رقم ${index}`,
  }))

let currentTime = 0
let scrollTo: ReturnType<typeof vi.fn>
let originalScrollTo: typeof Element.prototype.scrollTo

beforeEach(() => {
  currentTime = 0
  scrollTo = vi.fn()
  originalScrollTo = Element.prototype.scrollTo
  Element.prototype.scrollTo = scrollTo as never
  // jsdom reports a scroll height of 0, and the virtualizer never scrolls past `scrollHeight - clientHeight`
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(1_000_000)
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(800)
})

afterEach(() => {
  vi.restoreAllMocks()
  Element.prototype.scrollTo = originalScrollTo
})

function renderList(slices: PairedSlice[], isSearchActive = false) {
  return render(
    <TranscriptList
      slices={slices}
      getCurrentTime={() => currentTime}
      viewMode="both"
      revealedIndex={null}
      bookmarkedIds={new Set()}
      onToggleBookmark={() => {}}
      onSeek={() => {}}
      isSearchActive={isSearchActive}
    />,
  )
}

describe('TranscriptList is virtualised', () => {
  it('renders a bounded number of cards however long the video is', () => {
    const { container } = renderList(makeSlices(3000))
    const cards = container.querySelectorAll('[data-index]').length
    expect(cards).toBeGreaterThan(0)
    expect(cards).toBeLessThanOrEqual(40)
    expect(container.querySelectorAll('*').length).toBeLessThan(1500)
  })

  it('keeps the DOM the same size for a short and a very long transcript', () => {
    const short = renderList(makeSlices(60))
    const shortNodes = short.container.querySelectorAll('*').length
    short.unmount()
    const long = renderList(makeSlices(6000))
    expect(long.container.querySelectorAll('*').length).toBeLessThanOrEqual(shortNodes * 1.5)
  })

  it('scrolls to the active card even when it is far outside the rendered window', async () => {
    renderList(makeSlices(3000))
    scrollTo.mockClear()
    currentTime = 2500 * 2 + 0.5 // inside slice 2500, thousands of cards away from the top
    // The virtualizer scrolls to the top once on its own when it mounts, so look for the call that follows the video
    await waitFor(
      () => {
        const tops = (scrollTo.mock.calls as [{ top: number }][]).map(([options]) => options.top)
        expect(tops.some((top) => top > 100_000)).toBe(true)
      },
      { timeout: 2000 },
    )
  })

  it('does not follow the video while a search is active', async () => {
    renderList(makeSlices(3000), true)
    scrollTo.mockClear()
    currentTime = 2500 * 2 + 0.5
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600))
    })
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
