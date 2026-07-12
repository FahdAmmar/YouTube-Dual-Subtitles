import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { ViewModeToggle } from './ViewModeToggle'
import { SourceFileRow } from './SourceFileRow'
import { DownloadSubtitles } from './DownloadSubtitles'
import { TranscriptList } from './TranscriptList'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/utils/cn'
import type { SubtitleTrackState, TrackOffsetControls } from '@/types/subtitle.types'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { ViewMode } from '@/types/theme.types'

interface ConsolePanelProps {
  sourceTrack: SubtitleTrackState
  translationTrack: SubtitleTrackState
  sourceControls: TrackOffsetControls
  translationControls: TrackOffsetControls
  onUploadSource: (file: File) => void
  onUploadTranslation: (file: File) => void
  slices: PairedSlice[]
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  getCurrentTime: () => number
  isPlaying: boolean
  onSeek: (seconds: number) => void
  onOpenSettings: () => void
}

/**
 * لوحة التحكم الجانبية — "الكونسول" — تجمع كل ما يخص إدارة الترجمة في
 * مكان واحد منفصل عن منطقة الفيديو: وضع العرض، حالة الملفات المرفوعة،
 * التنزيل، ثم قائمة النص المتزامن القابلة للتمرير (تأخذ المساحة المتبقية)
 */
export function ConsolePanel({
  sourceTrack,
  translationTrack,
  sourceControls,
  translationControls,
  onUploadSource,
  onUploadTranslation,
  slices,
  viewMode,
  onViewModeChange,
  getCurrentTime,
  isPlaying,
  onSeek,
  onOpenSettings,
}: ConsolePanelProps) {
  // طي قسم الرفع/العرض/التنزيل تلقائياً بمجرد جهوزية المسارين معاً، لصالح
  // تفريغ أكبر مساحة ممكنة لقائمة النص المتزامن — وهو الغرض الأساسي من
  // اللوحة الجانبية بعد اكتمال الإعداد. يبقى القسم قابلاً للطي/الإظهار
  // يدوياً في أي وقت لاحق عبر السهم، لأن المستخدم قد يحتاج لاحقاً تغيير
  // ملف، ضبط إزاحة تزامن، أو تنزيل الترجمة
  const [isUploadSectionExpanded, setIsUploadSectionExpanded] = useState(true)
  const hasAutoCollapsedRef = useRef(false)
  const bothTracksReady = sourceTrack.status === 'ready' && translationTrack.status === 'ready'

  useEffect(() => {
    // الشرط hasAutoCollapsedRef يضمن أن هذا يحدث تلقائياً *مرة واحدة فقط*
    // (أول انتقال إلى "كلا المسارين جاهزان") — بعدها يملك المستخدم تحكماً
    // يدوياً كاملاً عبر السهم دون أن يقاومه هذا الأثر عند كل إعادة رسم
    if (bothTracksReady && !hasAutoCollapsedRef.current) {
      setIsUploadSectionExpanded(false)
      hasAutoCollapsedRef.current = true
    }
  }, [bothTracksReady])

  return (
    <aside className="flex h-full min-h-0 flex-col bg-surface lg:border-s lg:border-border">
      <div className="flex flex-col gap-3 border-b border-border p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-wide text-text-muted">
            <SlidersHorizontal size={12} aria-hidden="true" />
            DISPLAY_MODE
          </h2>
          <div className="flex items-center gap-0.5">
            <IconButton
              aria-label={isUploadSectionExpanded ? 'إخفاء قسم الرفع وإعدادات العرض' : 'إظهار قسم الرفع وإعدادات العرض'}
              aria-expanded={isUploadSectionExpanded}
              aria-controls="upload-controls-section"
              onClick={() => setIsUploadSectionExpanded((previous) => !previous)}
              className="h-7 w-7"
            >
              {isUploadSectionExpanded ? (
                <ChevronUp size={14} aria-hidden="true" />
              ) : (
                <ChevronDown size={14} aria-hidden="true" />
              )}
            </IconButton>
            <IconButton aria-label="فتح إعدادات حجم ولون الترجمة" onClick={onOpenSettings} className="h-7 w-7">
              <SlidersHorizontal size={14} aria-hidden="true" />
            </IconButton>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isUploadSectionExpanded && (
            <motion.div
              key="upload-controls"
              id="upload-controls-section"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3">
                <ViewModeToggle value={viewMode} onChange={onViewModeChange} />

                <div className="flex flex-col gap-2">
                  <SourceFileRow
                    track={sourceTrack}
                    accentClassName="bg-track-a"
                    onFileSelected={onUploadSource}
                    offsetControls={sourceControls}
                  />
                  <SourceFileRow
                    track={translationTrack}
                    accentClassName="bg-track-b"
                    onFileSelected={onUploadTranslation}
                    offsetControls={translationControls}
                  />
                </div>

                <DownloadSubtitles sourceTrack={sourceTrack} translationTrack={translationTrack} slices={slices} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* صف موجز يظهر فقط عند الطي: يؤكد أن الملفات ما زالت محمّلة ويتيح
            التوسيع بلمسة واحدة، دون الحاجة لإعادة فتح كامل القسم للتأكد */}
        {!isUploadSectionExpanded && (
          <button
            type="button"
            onClick={() => setIsUploadSectionExpanded(true)}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-elevated/40 px-3 py-2 text-start transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
          >
            <span className="flex min-w-0 items-center gap-3">
              <TrackStatusDot track={sourceTrack} accentClassName="bg-track-a" />
              <TrackStatusDot track={translationTrack} accentClassName="bg-track-b" />
            </span>
            <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] tracking-wide text-text-muted">
              <ChevronDown size={11} aria-hidden="true" />
              UPLOAD_SETTINGS
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 px-3.5 pt-3">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-console" aria-hidden="true" />
        <h2 className="font-mono text-[11px] font-medium tracking-wide text-text-muted">
          TRANSCRIPT — {slices.length} SEG
        </h2>
      </div>

      <TranscriptList
        slices={slices}
        getCurrentTime={getCurrentTime}
        isPlaying={isPlaying}
        viewMode={viewMode}
        onSeek={onSeek}
      />
    </aside>
  )
}

/** نقطة حالة مصغّرة لمسار واحد ضمن الصف الموجز — تُستخدم فقط في الحالة المطوية */
function TrackStatusDot({
  track,
  accentClassName,
}: {
  track: SubtitleTrackState
  accentClassName: string
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-text-secondary">
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          track.status === 'ready' ? accentClassName : 'bg-border',
        )}
        aria-hidden="true"
      />
      <span className="truncate">{track.languageLabel}</span>
    </span>
  )
}
