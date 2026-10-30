import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * Shown only while offline. Subtitles, saved words and reviews all work without a connection; what stops is the
 * video itself (YouTube/Vimeo) and the online word lookup, so the badge says that instead of leaving the learner guessing.
 */
export function ConnectionBadge() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  return (
    <span
      role="status"
      aria-label="حالة الاتصال"
      title="بلا اتصال: فيديو يوتيوب وVimeo والبحث عن معاني الكلمات لا يعملان، أما مفرداتك ومراجعتها فتعمل"
      className="flex items-center gap-1.5 rounded-full border border-warning/50 bg-warning/10 px-2.5 py-1 text-xs font-medium text-text-primary"
    >
      <WifiOff size={13} className="text-warning" aria-hidden="true" />
      غير متصل
    </span>
  )
}
