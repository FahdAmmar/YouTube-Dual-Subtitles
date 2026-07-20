import { useCallback, useRef, useSyncExternalStore } from 'react'

const TIME_POLL_INTERVAL_MS = 200

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

export function usePlayerTime(getCurrentTime: () => number, _isPlaying: boolean): number {
  const getCurrentTimeRef = useRef(getCurrentTime)
  getCurrentTimeRef.current = getCurrentTime

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
    sharedSubscribers.add(onStoreChange)
    sharedGetCurrentTime = () => getCurrentTimeRef.current()
    startInterval()

    return () => {
      sharedSubscribers.delete(onStoreChange)
      if (sharedSubscribers.size === 0) stopInterval()
    }
  }, [])

  return useSyncExternalStore(subscribe, () => sharedSnapshot, () => sharedSnapshot)
}
