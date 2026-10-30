import { Button } from '@/components/ui/Button'

interface PwaStatusToastProps {
  /** A newer version of the app has been downloaded and is waiting */
  needRefresh: boolean
  /** The app finished caching itself and works without a connection */
  offlineReady: boolean
  onUpdate: () => void
  onDismiss: () => void
}

/** A small note at the bottom of the screen: a new version is ready, or the app now works offline */
export function PwaStatusToast({ needRefresh, offlineReady, onUpdate, onDismiss }: PwaStatusToastProps) {
  if (!needRefresh && !offlineReady) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-60 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex max-w-md flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm shadow-elevated"
      >
        {needRefresh ? (
          <>
            <span className="text-text-primary">نسخة جديدة من التطبيق جاهزة</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={onUpdate}>
                تحديث الآن
              </Button>
              <Button size="sm" variant="secondary" onClick={onDismiss}>
                لاحقاً
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="text-text-primary">التطبيق جاهز للعمل دون اتصال</span>
            <Button size="sm" variant="secondary" onClick={onDismiss}>
              حسناً
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
