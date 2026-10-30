import { useState } from 'react'
import { Check, Copy, FileText, SearchX, Star } from 'lucide-react'
import { YT_DLP_COMMAND } from '@/constants/subtitleHelp'
import { copyToClipboard } from '@/lib/utils/copyToClipboard'

export type EmptyTranscriptReason = 'no-matches' | 'no-bookmarks' | 'no-subtitles'

interface EmptyTranscriptStateProps {
  reason: EmptyTranscriptReason
}

const COPY_FEEDBACK_MS = 2000

/**
 * What the transcript panel shows instead of a list. The no-subtitles case is the first thing a new user sees
 * after choosing a video, so it says what to do next and offers the subtitle-download command in one tap.
 */
export function EmptyTranscriptState({ reason }: EmptyTranscriptStateProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function handleCopyCommand() {
    const isCopied = await copyToClipboard(YT_DLP_COMMAND)
    setCopyStatus(isCopied ? 'copied' : 'failed')
    window.setTimeout(() => setCopyStatus('idle'), COPY_FEEDBACK_MS)
  }

  if (reason === 'no-matches') {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <SearchX size={22} className="text-text-muted" aria-hidden="true" />
        <p className="text-sm font-medium text-text-primary">لا نتائج</p>
        <p className="text-sm leading-relaxed text-text-muted">لا يوجد مقطع يطابق عبارة البحث</p>
      </div>
    )
  }

  if (reason === 'no-bookmarks') {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <Star size={22} className="text-text-muted" aria-hidden="true" />
        <p className="text-sm font-medium text-text-primary">لا جمل محفوظة</p>
        <p className="text-sm leading-relaxed text-text-muted">
          لم تحفظ أي جملة بعد — اضغط B أثناء التشغيل أو النجمة على أي مقطع
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <FileText size={22} className="text-text-muted" aria-hidden="true" />
      <p className="text-sm font-medium text-text-primary">لا يوجد نص بعد</p>
      <p className="text-sm leading-relaxed text-text-muted">ارفع ملف ترجمة واحداً على الأقل لعرض النص هنا</p>
      <button
        type="button"
        onClick={handleCopyCommand}
        className="flex min-h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-text-secondary transition-colors hover:border-console hover:text-console focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console"
      >
        {copyStatus === 'copied' ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
        نسخ أمر تنزيل الترجمة (yt-dlp)
      </button>
      <p role="status" className="min-h-4 text-xs text-text-muted">
        {copyStatus === 'copied' && 'تم النسخ — غيّر اللغات والرابط في الأمر ثم شغّله في الطرفية'}
        {copyStatus === 'failed' && 'تعذّر النسخ تلقائياً'}
      </p>
    </div>
  )
}
