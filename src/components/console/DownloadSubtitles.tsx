import { Download } from 'lucide-react'
import { cuesToSrt, pairedSlicesToSrt, downloadTextFile } from '@/lib/subtitles/serializeSRT'
import type { SubtitleTrackState } from '@/types/subtitle.types'
import type { PairedSlice } from '@/lib/subtitles/pairCues'

interface DownloadSubtitlesProps {
  sourceTrack: SubtitleTrackState
  translationTrack: SubtitleTrackState
  slices: PairedSlice[]
}

/** بناء اسم ملف آمن من اسم اللغة (إزالة أي حروف قد تسبب مشاكل في أنظمة الملفات) */
function safeFileName(label: string, suffix: string): string {
  const cleaned = label.replace(/[^\p{L}\p{N}_-]/gu, '_')
  return `${cleaned}_${suffix}.srt`
}

/**
 * قسم التنزيل — يبني ملفات SRT مباشرة من المقاطع المُحلَّلة الموجودة أصلاً
 * في الذاكرة (لا حاجة لأي طلب شبكي أو إعادة قراءة الملف الأصلي)، ويشغّل
 * التنزيل عبر Blob محلي بالكامل — متسق مع مبدأ "بلا خادم" للتطبيق
 */
export function DownloadSubtitles({ sourceTrack, translationTrack, slices }: DownloadSubtitlesProps) {
  const canDownloadSource = sourceTrack.cues.length > 0
  const canDownloadTranslation = translationTrack.cues.length > 0
  const canDownloadBoth = canDownloadSource && canDownloadTranslation

  return (
    <div className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-wide text-text-muted">
        <Download size={12} aria-hidden="true" />
        DOWNLOAD_SUBTITLES
      </h2>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={!canDownloadSource}
          onClick={() =>
            downloadTextFile(cuesToSrt(sourceTrack.cues), safeFileName(sourceTrack.languageLabel, 'source'))
          }
          className="rounded-sm border border-border px-2.5 py-1.5 font-mono text-[11px] text-text-secondary transition-colors hover:border-console hover:text-console disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
        >
          [ SOURCE_ONLY ]
        </button>
        <button
          type="button"
          disabled={!canDownloadTranslation}
          onClick={() =>
            downloadTextFile(
              cuesToSrt(translationTrack.cues),
              safeFileName(translationTrack.languageLabel, 'translation'),
            )
          }
          className="rounded-sm border border-border px-2.5 py-1.5 font-mono text-[11px] text-text-secondary transition-colors hover:border-console hover:text-console disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
        >
          [ TRANSLATED ]
        </button>
        <button
          type="button"
          disabled={!canDownloadBoth}
          onClick={() => downloadTextFile(pairedSlicesToSrt(slices), 'dual_subtitles.srt')}
          className="rounded-sm border border-console/50 bg-console/5 px-2.5 py-1.5 font-mono text-[11px] text-console transition-colors hover:bg-console/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-console/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
        >
          [ BOTH_LANGUAGES ]
        </button>
      </div>
    </div>
  )
}
