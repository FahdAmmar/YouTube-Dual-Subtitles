import { useEffect, useRef } from 'react'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { CurrentSlice } from '@/lib/subtitles/findCurrentSlice'

const POLL_INTERVAL_MS = 80
/** Jump back slightly before the end so the next line never starts to play */
const LOOP_EARLY_SECONDS = 0.05
/** The player reports its old time for a moment after a seek: ignore it */
const SEEK_SETTLE_MS = 350

interface LoopPlayer {
  getCurrentTime: () => number
  seekTo: (seconds: number) => void
}

/**
 * Repeats the current line while enabled. The loop locks to the line current when
 * it was enabled; since looping stops the line from ever advancing, any later
 * change of the current line was a deliberate seek by the user, so it re-locks there.
 */
export function useLineLoop(
  isEnabled: boolean,
  slices: PairedSlice[],
  current: CurrentSlice,
  player: LoopPlayer,
): void {
  const lockedIndexRef = useRef(-1)
  const lastSeekAtRef = useRef(0)
  const playerRef = useRef(player)
  playerRef.current = player

  useEffect(() => {
    lockedIndexRef.current = isEnabled ? current.index : -1
  }, [isEnabled, current.index])

  useEffect(() => {
    if (!isEnabled) return
    const intervalId = setInterval(() => {
      const slice = slices[lockedIndexRef.current]
      if (!slice || Date.now() - lastSeekAtRef.current < SEEK_SETTLE_MS) return
      if (playerRef.current.getCurrentTime() >= slice.end - LOOP_EARLY_SECONDS) {
        lastSeekAtRef.current = Date.now()
        playerRef.current.seekTo(slice.start)
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [isEnabled, slices])
}
