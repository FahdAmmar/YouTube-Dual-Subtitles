import { Clock, FileVideo, Captions, X } from 'lucide-react'
import { useWatchHistoryEntries } from '@/hooks/useWatchHistory'
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime'
import { IconButton } from '@/components/ui/IconButton'

interface WatchHistoryListProps {
  /** فيديو يوتيوب: يُحمَّل مباشرة بنقرة واحدة، بلا أي خطوة إضافية */
  onSelectYoutube: (videoId: string) => void
  /**
   * فيديو محلي: لا يمكن إعادة فتح الملف تلقائياً (قيد أمان المتصفح الأساسي
   * يمنع أي موقع من الوصول لملف على القرص بلا اختيار المستخدم له صراحةً
   * في كل مرة) — هذا فقط يُظهر تذكيراً واضحاً باسم الملف المطلوب ويوجّه
   * لتبويب الرفع المحلي، ولا يُحمّل شيئاً بنفسه
   */
  onSelectLocal: (fileName: string) => void
}

/**
 * سجل مشاهدات بسيط يعمل بلا أي خادم — كل بياناته من useWatchHistory
 * (localStorage)، ولا يُعرَض إطلاقاً إن كان السجل فارغاً (لا حاجة لحالة
 * "فارغ" هنا؛ VideoUrlForm أسفله يكفي وحده لأول زيارة)
 */
export function WatchHistoryList({ onSelectYoutube, onSelectLocal }: WatchHistoryListProps) {
  const { entries, removeEntry, clearHistory } = useWatchHistoryEntries()

  if (entries.length === 0) return null

  return (
    <div className="mb-4 flex w-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-text-muted">
          <Clock size={12} aria-hidden="true" />
          متابعة المشاهدة
        </span>
        <button
          type="button"
          onClick={clearHistory}
          className="rounded-sm font-mono text-[10px] text-text-muted transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
        >
          مسح الكل
        </button>
      </div>

      <ul className="flex flex-col gap-1.5">
        {entries.slice(0, 8).map((entry) => {
          const hasRememberedSubtitles = Boolean(entry.subtitleFileNames.source || entry.subtitleFileNames.translation)

          return (
            <li
              key={entry.videoKey}
              className="flex items-center gap-1 rounded-md border border-border bg-surface-elevated/50 p-1.5 transition-colors hover:border-console hover:bg-console/5"
            >
              <button
                type="button"
                onClick={() =>
                  entry.source.type === 'youtube'
                    ? onSelectYoutube(entry.source.videoId)
                    : onSelectLocal(entry.source.fileName)
                }
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sm p-0.5 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
              >
                {entry.thumbnailUrl ? (
                  <img
                    src={entry.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="h-9 w-16 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-16 shrink-0 items-center justify-center rounded-sm bg-surface-elevated text-text-muted">
                    <FileVideo size={16} aria-hidden="true" />
                  </span>
                )}

                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-medium text-text-primary">{entry.displayName}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
                    <span>{formatRelativeTime(entry.lastWatchedAt)}</span>
                    {hasRememberedSubtitles && <Captions size={11} aria-hidden="true" />}
                  </span>
                </span>
              </button>

              <IconButton
                aria-label={`إزالة ${entry.displayName} من السجل`}
                onClick={() => removeEntry(entry.videoKey)}
                className="h-7 w-7 shrink-0"
              >
                <X size={13} aria-hidden="true" />
              </IconButton>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
