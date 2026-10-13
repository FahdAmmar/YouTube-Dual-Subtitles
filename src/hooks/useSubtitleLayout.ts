import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import {
  DEFAULT_LAYOUT,
  ZERO_OFFSET,
  nextPlacement,
  normalizeLayout,
  type LineOffset,
  type SubtitleLayout,
  type SubtitleLine,
} from '@/lib/subtitles/subtitleLayout'

export interface UseSubtitleLayoutResult {
  layout: SubtitleLayout
  setLineOffset: (line: SubtitleLine, offset: LineOffset) => void
  /** Moves the block to the next region (bottom → middle → top) and clears manual offsets */
  cyclePlacement: () => void
}

/** Persisted placement + per-line drag offsets. Lives in VideoStage so the overlay and the control bar share it. */
export function useSubtitleLayout(): UseSubtitleLayoutResult {
  const [stored, setStored] = useLocalStorage<SubtitleLayout>(STORAGE_KEYS.SUBTITLE_LAYOUT, DEFAULT_LAYOUT)
  const layout = useMemo(() => normalizeLayout(stored), [stored])

  const setLineOffset = useCallback(
    (line: SubtitleLine, offset: LineOffset) => {
      setStored((previous) => ({ ...normalizeLayout(previous), [line]: offset }))
    },
    [setStored],
  )

  const cyclePlacement = useCallback(() => {
    setStored((previous) => ({
      placement: nextPlacement(normalizeLayout(previous).placement),
      source: ZERO_OFFSET,
      translation: ZERO_OFFSET,
    }))
  }, [setStored])

  return { layout, setLineOffset, cyclePlacement }
}
