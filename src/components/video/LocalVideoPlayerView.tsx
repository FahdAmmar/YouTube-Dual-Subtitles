import type { RefObject } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'

interface LocalVideoPlayerViewProps {
  videoRef: RefObject<HTMLVideoElement>
  objectUrl: string
  isReady: boolean
  loadError: string | null
}

/**
 * الحاوية البصرية لملف فيديو محلي — نظير LocalVideoPlayerView لـ
 * YouTubePlayerView تماماً (نفس حالات التحميل/الخطأ، نفس أبعاد 16:9)، بحيث
 * لا يلاحظ VideoStage أي فرق بين الاثنين. عنصر <video> نفسه يبقى دون
 * عناصر تحكم متصفح افتراضية (controls غائبة عمداً) لصالح VideoControlBar
 * المخصص، تماماً كإخفاء واجهة يوتيوب الافتراضية عبر controls: 0
 */
export function LocalVideoPlayerView({ videoRef, objectUrl, isReady, loadError }: LocalVideoPlayerViewProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-elevated">
      {/* playsInline ضروري على iOS Safari لمنع فتح مشغّل ملء الشاشة الأصلي
          تلقائياً عند التشغيل، بما يحافظ على تصميم الترجمة المزدوجة فوقه */}
      <video ref={videoRef} src={objectUrl} playsInline className="h-full w-full" />

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
