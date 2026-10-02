import { useCallback, useEffect, useRef, useState } from 'react'
import { findActiveCue } from '@/lib/subtitles/findActiveCue'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { ViewMode } from '@/types/theme.types'

export interface UseTranslationRevealResult {
  /** originalIndex of the segment whose translation is currently revealed, if any */
  revealedIndex: number | null
  /** Reveals (or hides again) the translation of the segment playing right now; recall mode only */
  toggleReveal: () => void
}

/**
 * State for "recall" view mode. Only an index is stored, and every surface
 * treats a segment as revealed only while it is the one playing: the answer
 * hides once playback moves on, stays open when the same segment repeats
 * (scene repeat), and reappears if you return to it until another segment is
 * revealed. Reads the clock imperatively on demand instead of subscribing to
 * it, so the app shell does not re-render every tick.
 */
export function useTranslationReveal(
  slices: PairedSlice[],
  getCurrentTime: () => number,
  viewMode: ViewMode,
): UseTranslationRevealResult {
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null)

  const slicesRef = useRef(slices)
  slicesRef.current = slices
  const getCurrentTimeRef = useRef(getCurrentTime)
  getCurrentTimeRef.current = getCurrentTime

  useEffect(() => {
    setRevealedIndex(null)
  }, [viewMode])

  const toggleReveal = useCallback(() => {
    if (viewMode !== 'recall') return
    const active = findActiveCue(slicesRef.current, getCurrentTimeRef.current())
    if (!active) return
    setRevealedIndex((current) => (current === active.originalIndex ? null : active.originalIndex))
  }, [viewMode])

  return { revealedIndex, toggleReveal }
}
