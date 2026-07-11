import { Loader2, AlertTriangle } from 'lucide-react'

interface YouTubePlayerViewProps {
  containerId: string
  isReady: boolean
  loadError: string | null
}

/**
 * الحاوية البصرية للمشغّل. لاحظ أن هذا المكوّن لا "يُنشئ" iframe يدوياً —
 * مكتبة يوتيوب نفسها (عبر useYouTubePlayer) تستبدل العنصر ذا المعرّف
 * containerId بعنصر iframe خاص بها بعد التحميل. نستخدم نسبة عرض إلى ارتفاع
 * 16:9 ثابتة عبر aspect-video لمنع القفزات في التخطيط (تحسين CLS)
 */
export function YouTubePlayerView({ containerId, isReady, loadError }: YouTubePlayerViewProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-elevated">
      <div id={containerId} className="h-full w-full" />

      {!isReady && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <Loader2 size={28} className="animate-spin text-text-muted" aria-hidden="true" />
          <span className="sr-only">جاري تحميل الفيديو</span>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 px-6 text-center">
          <AlertTriangle size={26} className="text-error" aria-hidden="true" />
          <p role="alert" className="text-sm text-text-secondary">
            {loadError}
          </p>
        </div>
      )}
    </div>
  )
}
