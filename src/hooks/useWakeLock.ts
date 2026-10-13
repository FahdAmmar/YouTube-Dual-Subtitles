import { useEffect } from 'react'

/** Keeps the screen on while reading along. Unsupported browsers simply ignore it. */
export function useWakeLock(isEnabled: boolean): void {
  useEffect(() => {
    if (!isEnabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let isCancelled = false

    async function acquire() {
      try {
        const next = await navigator.wakeLock.request('screen')
        if (isCancelled) void next.release()
        else sentinel = next
      } catch {
        // Denied (e.g. low battery): reading works the same without it
      }
    }

    // The browser drops the lock when the tab is hidden, so take it again on return
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      isCancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void sentinel?.release()
    }
  }, [isEnabled])
}
