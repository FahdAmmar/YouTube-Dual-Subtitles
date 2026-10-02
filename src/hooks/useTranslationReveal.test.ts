import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTranslationReveal } from './useTranslationReveal'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { ViewMode } from '@/types/theme.types'

const SLICES: PairedSlice[] = [0, 1, 2].map((index) => ({
  id: `s${index}`,
  originalIndex: index,
  start: index * 4,
  end: index * 4 + 3,
  sourceText: `src ${index}`,
  translationText: `tr ${index}`,
}))

function setup(initialMode: ViewMode, time: { current: number }) {
  return renderHook(
    ({ mode }) => useTranslationReveal(SLICES, () => time.current, mode),
    { initialProps: { mode: initialMode } },
  )
}

describe('useTranslationReveal', () => {
  it('reveals the active segment in recall mode and hides it again on a second toggle', () => {
    const time = { current: 5 }
    const { result } = setup('recall', time)

    act(() => result.current.toggleReveal())
    expect(result.current.revealedIndex).toBe(1)

    act(() => result.current.toggleReveal())
    expect(result.current.revealedIndex).toBeNull()
  })

  it('does nothing outside recall mode', () => {
    const { result } = setup('both', { current: 5 })
    act(() => result.current.toggleReveal())
    expect(result.current.revealedIndex).toBeNull()
  })

  it('does nothing between segments, when no segment is active', () => {
    const { result } = setup('recall', { current: 3.5 })
    act(() => result.current.toggleReveal())
    expect(result.current.revealedIndex).toBeNull()
  })

  it('reveals a different segment after time moves on, replacing the previous one', () => {
    const time = { current: 1 }
    const { result } = setup('recall', time)

    act(() => result.current.toggleReveal())
    expect(result.current.revealedIndex).toBe(0)

    time.current = 9
    act(() => result.current.toggleReveal())
    expect(result.current.revealedIndex).toBe(2)
  })

  it('clears the reveal whenever the view mode changes', () => {
    const { result, rerender } = setup('recall', { current: 5 })
    act(() => result.current.toggleReveal())
    expect(result.current.revealedIndex).toBe(1)

    rerender({ mode: 'both' })
    expect(result.current.revealedIndex).toBeNull()
  })
})
