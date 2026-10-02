import { useEffect } from 'react'
import { addWatchSeconds } from '@/lib/utils/learningStatsStore'

const TICK_INTERVAL_MS = 5000
// A gap longer than this is a sleeping device or a stalled timer, not watching
const MAX_GAP_SECONDS_VISIBLE = 10
// Browsers throttle timers in background tabs to about one a minute
const MAX_GAP_SECONDS_HIDDEN = 65

/** Adds the seconds spent actually playing to today's total, flushing on pause and on leaving */
export function useWatchTimeTracker(isPlaying: boolean): void {
  useEffect(() => {
    if (!isPlaying) return

    let lastTick = Date.now()

    function record() {
      const now = Date.now()
      const cap = document.hidden ? MAX_GAP_SECONDS_HIDDEN : MAX_GAP_SECONDS_VISIBLE
      addWatchSeconds(Math.min((now - lastTick) / 1000, cap), new Date(now))
      lastTick = now
    }

    const timer = setInterval(record, TICK_INTERVAL_MS)
    window.addEventListener('pagehide', record)
    return () => {
      clearInterval(timer)
      window.removeEventListener('pagehide', record)
      record()
    }
  }, [isPlaying])
}
