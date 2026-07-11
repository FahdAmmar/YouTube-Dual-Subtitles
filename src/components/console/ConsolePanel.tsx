import { SlidersHorizontal } from 'lucide-react'
import { ViewModeToggle } from './ViewModeToggle'
import { SourceFileRow } from './SourceFileRow'
import { DownloadSubtitles } from './DownloadSubtitles'
import { TranscriptList } from './TranscriptList'
import { IconButton } from '@/components/ui/IconButton'
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
  return (
    <aside className="flex h-full min-h-0 flex-col bg-surface lg:border-s lg:border-border">
      <div className="flex flex-col gap-3 border-b border-border p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-wide text-text-muted">
            <SlidersHorizontal size={12} aria-hidden="true" />
            DISPLAY_MODE
          </h2>
          <IconButton aria-label="فتح إعدادات حجم ولون الترجمة" onClick={onOpenSettings} className="h-7 w-7">
            <SlidersHorizontal size={14} aria-hidden="true" />
          </IconButton>
        </div>

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
