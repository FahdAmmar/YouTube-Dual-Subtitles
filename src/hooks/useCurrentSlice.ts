import { useEffect, useRef, useState } from 'react'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import { findCurrentSlice, type CurrentSlice } from '@/lib/subtitles/findCurrentSlice'

const POLL_INTERVAL_MS = 100

/** Re-renders only when the current line changes, not on every time tick */
export function useCurrentSlice(slices: PairedSlice[], getCurrentTime: () => number): CurrentSlice {
  const getCurrentTimeRef = useRef(getCurrentTime)
  getCurrentTimeRef.current = getCurrentTime

  const [current, setCurrent] = useState(() => findCurrentSlice(slices, getCurrentTime()))

  useEffect(() => {
    const update = () => {
      const next = findCurrentSlice(slices, getCurrentTimeRef.current())
      setCurrent((previous) =>
        previous.index === next.index && previous.isActive === next.isActive ? previous : next,
      )
    }
    update()
    const intervalId = setInterval(update, POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [slices])

  return current
}
