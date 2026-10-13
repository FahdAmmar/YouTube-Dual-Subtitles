import { useState } from 'react'
import { ChevronDown, Crosshair, Ruler } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { computeTwoPointSync, MIN_ANCHOR_GAP_SECONDS, type TwoPointSyncResult } from '@/lib/subtitles/twoPointSync'
import { formatClock } from '@/lib/utils/formatClock'
import type { SubtitleCue } from '@/types/subtitle.types'

interface TwoPointSyncProps {
  cues: SubtitleCue[]
  getCurrentTime: () => number
  onSeek: (seconds: number) => void
  /** Receives the line videoTime = scale * cueTime + offset */
  onApply: (scale: number, offset: number) => void
}

interface AnchorDraft {
  cueNumber: string
  videoTime: number | null
}

const ERROR_MESSAGES: Record<Extract<TwoPointSyncResult, { ok: false }>['reason'], string> = {
  'too-close': `اختر جملتين متباعدتين (بينهما ${MIN_ANCHOR_GAP_SECONDS} ثانية على الأقل)، أفضلهما في بداية الفيديو ونهايته.`,
  implausible: 'الوقتان لا يتوافقان مع نفس الملف. تأكد أنك ثبّتَّ الوقت عند نطق الجملة المعروضة تحديداً.',
}

const formatTime = (seconds: number) => `${formatClock(seconds)}.${Math.floor((seconds % 1) * 10)}`

/**
 * For subtitles that drift (the delay grows or shrinks through the video), which one
 * constant shift cannot fix: match one line near the start and one near the end.
 */
export function TwoPointSync({ cues, getCurrentTime, onSeek, onApply }: TwoPointSyncProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [anchors, setAnchors] = useState<[AnchorDraft, AnchorDraft]>(() => [
    { cueNumber: '1', videoTime: null },
    { cueNumber: String(cues.length), videoTime: null },
  ])
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  function updateAnchor(index: 0 | 1, patch: Partial<AnchorDraft>) {
    setMessage(null)
    setAnchors((previous) => {
      const next: [AnchorDraft, AnchorDraft] = [{ ...previous[0] }, { ...previous[1] }]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  function getCue(draft: AnchorDraft): SubtitleCue | null {
    const number = Number(draft.cueNumber)
    return Number.isInteger(number) ? (cues[number - 1] ?? null) : null
  }

  const [firstCue, secondCue] = [getCue(anchors[0]), getCue(anchors[1])]
  const canApply =
    firstCue !== null && secondCue !== null && anchors[0].videoTime !== null && anchors[1].videoTime !== null

  function apply() {
    if (!firstCue || !secondCue || anchors[0].videoTime === null || anchors[1].videoTime === null) return
    const result = computeTwoPointSync(
      { cueTime: firstCue.start, videoTime: anchors[0].videoTime },
      { cueTime: secondCue.start, videoTime: anchors[1].videoTime },
    )
    if (!result.ok) {
      setMessage({ kind: 'error', text: ERROR_MESSAGES[result.reason] })
      return
    }
    onApply(result.scale, result.offset)
    setMessage({ kind: 'success', text: 'تمت المزامنة وحُفظت للملف.' })
    setIsOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex w-fit items-center gap-1.5 rounded-sm px-1 py-1 text-[11px] text-text-muted transition-colors hover:text-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
      >
        <Ruler size={12} aria-hidden="true" />
        مزامنة بنقطتين (للترجمة التي تتأخر تدريجياً)
        <ChevronDown size={12} aria-hidden="true" className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {message?.kind === 'success' && (
        <p role="status" className="text-[11px] text-success">
          {message.text}
        </p>
      )}

      {isOpen && (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-bg p-3">
          <p className="text-[11px] leading-relaxed text-text-secondary">
            لكل نقطة: اختر رقم جملة، واذهب إليها في الفيديو، ثم أوقف الفيديو تماماً عند نطقها وثبّت الوقت.
          </p>

          {([0, 1] as const).map((index) => {
            const cue = index === 0 ? firstCue : secondCue
            const anchor = anchors[index]
            return (
              <div key={index} className="flex flex-col gap-1.5 border-t border-border pt-2 first:border-0 first:pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-primary">النقطة {index + 1}</span>
                  <input
                    type="number"
                    min={1}
                    max={cues.length}
                    value={anchor.cueNumber}
                    aria-label={`رقم الجملة للنقطة ${index + 1}`}
                    onChange={(event) => updateAnchor(index, { cueNumber: event.target.value, videoTime: null })}
                    className="w-20 rounded-sm border border-border bg-surface-elevated px-2 py-1 font-mono text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
                    dir="ltr"
                  />
                  <span className="font-mono text-[10px] text-text-muted" dir="ltr">
                    / {cues.length}
                  </span>
                </div>

                <p className="line-clamp-2 min-h-[2rem] text-xs text-text-secondary" dir="auto">
                  {cue ? cue.text : 'رقم غير صالح'}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!cue}
                    onClick={() => cue && onSeek(cue.start)}
                    className="rounded-sm border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:text-text-primary disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
                  >
                    اذهب إلى الجملة
                  </button>
                  <button
                    type="button"
                    disabled={!cue}
                    onClick={() => updateAnchor(index, { videoTime: getCurrentTime() })}
                    className="flex items-center gap-1 rounded-sm border border-console/60 px-2 py-1 text-[11px] text-console transition-colors hover:bg-console/10 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
                  >
                    <Crosshair size={11} aria-hidden="true" />
                    ثبّت وقت الفيديو الحالي
                  </button>
                  {anchor.videoTime !== null && (
                    <span className="font-mono text-[11px] text-success" dir="ltr">
                      {formatTime(anchor.videoTime)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {message?.kind === 'error' && (
            <p role="alert" className="text-[11px] text-error">
              {message.text}
            </p>
          )}

          <button
            type="button"
            disabled={!canApply}
            onClick={apply}
            className="rounded-md bg-console px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-console-hover disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            طبّق المزامنة
          </button>
        </div>
      )}
    </div>
  )
}
