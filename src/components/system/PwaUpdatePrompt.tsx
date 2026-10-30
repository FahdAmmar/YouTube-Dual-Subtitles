import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { PwaStatusToast } from './PwaStatusToast'

/** The "ready offline" note is only good news: it fades by itself, unlike an update, which waits for an answer */
const OFFLINE_READY_NOTICE_MS = 6000

/**
 * Registers the service worker and lets the learner decide when to switch to a new version. Updating on its
 * own would swap the files under a page that is still open, and a lazily loaded panel (settings, vocabulary)
 * could then ask for a file the new version no longer has.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!offlineReady || needRefresh) return
    const timer = setTimeout(() => setOfflineReady(false), OFFLINE_READY_NOTICE_MS)
    return () => clearTimeout(timer)
  }, [offlineReady, needRefresh, setOfflineReady])

  return (
    <PwaStatusToast
      needRefresh={needRefresh}
      offlineReady={offlineReady}
      onUpdate={() => void updateServiceWorker(true)}
      onDismiss={() => {
        setNeedRefresh(false)
        setOfflineReady(false)
      }}
    />
  )
}
