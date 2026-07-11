import { useRef, type ChangeEvent } from 'react'
import { Upload, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { SyncOffsetControl } from '@/components/subtitles/SyncOffsetControl'
import { cn } from '@/lib/utils/cn'
import type { SubtitleTrackState, TrackOffsetControls } from '@/types/subtitle.types'

interface SourceFileRowProps {
  track: SubtitleTrackState
  accentClassName: string
  onFileSelected: (file: File) => void
  offsetControls: TrackOffsetControls
}

/**
 * صف مضغوط يلخّص حالة مسار ترجمة واحد داخل لوحة التحكم — بديل مصغّر عن
 * بطاقة الرفع الكبيرة (SubtitleTrackCard) المناسب لمساحة الشريط الجانبي
 * الضيقة نسبياً بعد بدء التشغيل. يسمح بتغيير الملف في أي وقت دون الحاجة
 * للعودة لشاشة الإعداد الأولية.
 */
export function SourceFileRow({ track, accentClassName, onFileSelected, offsetControls }: SourceFileRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onFileSelected(file)
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-surface-elevated/50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', accentClassName)} aria-hidden="true" />
          <span className="truncate text-[13px] font-medium text-text-primary">{track.languageLabel}</span>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-1 font-mono text-[10px] text-text-muted transition-colors hover:text-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
        >
          <Upload size={11} aria-hidden="true" />
          {track.fileName ? 'CHANGE' : 'UPLOAD'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".srt,.vtt"
          className="sr-only"
          onChange={handleChange}
        />
      </div>

      <div className="flex items-center gap-2">
        {track.status === 'ready' && track.fileName && (
          <p className="flex min-w-0 flex-1 items-center gap-1 truncate text-[11px] text-success">
            <CheckCircle2 size={11} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{track.fileName}</span>
          </p>
        )}
        {track.status === 'parsing' && (
          <p className="flex flex-1 items-center gap-1 text-[11px] text-text-muted">
            <Loader2 size={11} className="animate-spin" aria-hidden="true" />
            جارٍ التحليل...
          </p>
        )}
        {track.status === 'error' && track.errorMessage && (
          <p role="alert" className="flex min-w-0 flex-1 items-center gap-1 truncate text-[11px] text-error">
            <XCircle size={11} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{track.errorMessage}</span>
          </p>
        )}
        {track.status === 'empty' && (
          <p className="flex-1 text-[11px] text-text-muted">لم يُرفع ملف بعد</p>
        )}

        {track.cues.length > 0 && (
          <div className="shrink-0">
            <SyncOffsetControl
              offsetSeconds={track.syncOffsetSeconds}
              onNudge={offsetControls.nudgeSyncOffset}
              onReset={offsetControls.resetSyncOffset}
            />
          </div>
        )}
      </div>
    </div>
  )
}
