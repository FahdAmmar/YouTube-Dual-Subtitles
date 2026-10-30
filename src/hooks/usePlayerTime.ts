import { useCallback, useRef, useSyncExternalStore } from 'react'

const TIME_POLL_INTERVAL_MS = 200

/**
 * The one shared player clock: a single interval reads the player's time and wakes the subscribers
 * only when it changed. It runs while at least one component is subscribed.
 */
let sharedGetCurrentTime: (() => number) | null = null
let sharedIntervalId: ReturnType<typeof setInterval> | null = null
const sharedSubscribers = new Set<() => void>()
let sharedSnapshot = 0

function tick(): void {
  const next = sharedGetCurrentTime?.() ?? 0
  if (next !== sharedSnapshot) {
    sharedSnapshot = next
    sharedSubscribers.forEach((fn) => fn())
  }
}

function startInterval(): void {
  if (sharedIntervalId !== null) return
  sharedSnapshot = sharedGetCurrentTime?.() ?? 0
  sharedIntervalId = setInterval(tick, TIME_POLL_INTERVAL_MS)
}

function stopInterval(): void {
  if (sharedIntervalId === null) return
  clearInterval(sharedIntervalId)
  sharedIntervalId = null
  sharedGetCurrentTime = null
}

/**
 * Subscribes to the shared clock but re-renders only when `select(time)` changes.
 *
 * Most components do not need the time, they need something derived from it (the cue playing now, a progress
 * percentage). Reading the raw time with `usePlayerTime` re-renders them on every tick, five times a second, even
 * while what they show has not changed. A selector turns that into one render per change.
 *
 * `select` must be pure and return a stable value for the same time: a primitive or an object that already exists
 * (such as an item of a cues array), never a new object or array, or React sees a change on every call.
 */
export function useClockSelector<T>(getCurrentTime: () => number, select: (time: number) => T): T {
  const getCurrentTimeRef = useRef(getCurrentTime)
  getCurrentTimeRef.current = getCurrentTime

  const subscribe = useCallback((onStoreChange: () => void) => {
    sharedSubscribers.add(onStoreChange)
    sharedGetCurrentTime = () => getCurrentTimeRef.current()
    startInterval()

    return () => {
      sharedSubscribers.delete(onStoreChange)
      if (sharedSubscribers.size === 0) stopInterval()
    }
  }, [])

  const getSnapshot = () => select(sharedSnapshot)
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

const identity = (time: number) => time

/** The raw time: re-renders on every tick. Prefer `useClockSelector` unless the time itself is displayed */
export function usePlayerTime(getCurrentTime: () => number): number {
  return useClockSelector(getCurrentTime, identity)
}
