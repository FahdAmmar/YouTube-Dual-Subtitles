import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Eye, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getDueEntries, getIntervalLabel } from '@/lib/utils/spacedRepetition'
import { getValidContext, makeCloze } from '@/lib/utils/glossaryContext'
import { formatClock } from '@/lib/utils/formatClock'
import type { GlossaryEntry, ReviewGrade } from '@/types/glossary.types'

interface GlossaryReviewProps {
  entries: GlossaryEntry[]
  currentVideoKey: string | null
  onGrade: (id: string, grade: ReviewGrade) => void
  onSeekToTime?: (seconds: number) => void
  onExit: () => void
}

const GRADES: { grade: ReviewGrade; label: string; className: string }[] = [
  { grade: 'again', label: 'لم أتذكرها', className: 'border-red-500/50 text-red-500 hover:bg-red-500/10' },
  { grade: 'good', label: 'تذكرتها', className: 'border-console/60 text-console hover:bg-console/10' },
  { grade: 'easy', label: 'سهلة', className: 'border-track-b/60 text-track-b hover:bg-track-b/10' },
]

/** One pass over the words that are due. The queue is fixed when the session starts. */
export function GlossaryReview({ entries, currentVideoKey, onGrade, onSeekToTime, onExit }: GlossaryReviewProps) {
  const [queueIds] = useState(() => getDueEntries(entries, Date.now()).map((entry) => entry.id))
  const [position, setPosition] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)

  const entry = useMemo(
    () => entries.find((candidate) => candidate.id === queueIds[position]) ?? null,
    [entries, queueIds, position],
  )

  const isFinished = position >= queueIds.length || entry === null

  function answer(grade: ReviewGrade) {
    if (!entry) return
    onGrade(entry.id, grade)
    setIsRevealed(false)
    setPosition((previous) => previous + 1)
  }

  if (isFinished) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
        <CheckCircle2 size={32} className="text-track-b" aria-hidden="true" />
        <p className="text-base font-semibold text-text-primary">
          {queueIds.length === 0 ? 'لا توجد كلمات مستحقة للمراجعة الآن' : 'أنهيت مراجعة اليوم'}
        </p>
        <p className="text-sm text-text-secondary">
          {queueIds.length === 0
            ? 'عد لاحقاً، أو أضف كلمات جديدة من الترجمة.'
            : `راجعت ${queueIds.length} ${queueIds.length === 1 ? 'كلمة' : 'كلمات'}. ستعود كل كلمة في موعدها.`}
        </p>
        <Button variant="secondary" size="sm" onClick={onExit}>
          العودة إلى القائمة
        </Button>
      </div>
    )
  }

  const context = getValidContext(entry)
  const cloze = context ? makeCloze(context.sentence, entry.word) : null
  const hint = entry.translation || entry.definition
  const canJump = context !== null && context.videoKey === currentVideoKey && onSeekToTime !== undefined
  // A fill-in-the-blank card needs a hint to be answerable; otherwise show the plain word
  const isClozeCard = cloze?.hasBlank === true && Boolean(hint)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-text-muted">
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1 rounded-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
        >
          <ArrowRight size={13} aria-hidden="true" />
          القائمة
        </button>
        <span className="font-mono tabular-nums" dir="ltr">
          {position + 1} / {queueIds.length}
        </span>
      </div>

      <div className="flex min-h-[11rem] flex-col justify-center gap-3 rounded-lg border border-border bg-surface-elevated p-5">
        {isClozeCard ? (
          <>
            <p className="text-xs text-text-muted">أكمل الجملة بالكلمة المناسبة</p>
            <p className="text-lg font-semibold leading-relaxed text-text-primary" dir="auto">
              {cloze.text}
            </p>
            <p className="text-sm text-console" dir="auto">
              تلميح: {hint}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-text-muted">ما معنى هذه الكلمة؟</p>
            <p className="text-2xl font-bold text-text-primary" dir="auto">
              {entry.word}
            </p>
          </>
        )}

        {isRevealed && (
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
            <p className="text-xl font-bold text-text-primary" dir="auto">
              {entry.word}
            </p>
            {entry.translation && (
              <p className="font-semibold text-console" dir="auto">
                {entry.translation}
              </p>
            )}
            {entry.definition && (
              <p className="text-sm text-text-secondary" dir="auto">
                {entry.definition}
              </p>
            )}
            {context && (
              <p className="text-sm italic text-text-muted" dir="auto">
                «{context.sentence}»
              </p>
            )}
            {canJump && (
              <button
                type="button"
                onClick={() => onSeekToTime?.(context.time)}
                className="flex w-fit items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs font-medium text-console hover:bg-console/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
              >
                <MapPin size={12} aria-hidden="true" />
                اسمعها في الفيديو ({formatClock(context.time)})
              </button>
            )}
          </div>
        )}
      </div>

      {isRevealed ? (
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="مدى تذكّرك للكلمة">
          {GRADES.map(({ grade, label, className }) => (
            <button
              key={grade}
              type="button"
              onClick={() => answer(grade)}
              className={`flex flex-col items-center gap-0.5 rounded-md border px-2 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console ${className}`}
            >
              {label}
              <span className="font-mono text-[10px] opacity-80">{getIntervalLabel(entry, grade)}</span>
            </button>
          ))}
        </div>
      ) : (
        <Button onClick={() => setIsRevealed(true)}>
          <Eye size={15} aria-hidden="true" />
          إظهار الإجابة
        </Button>
      )}
    </div>
  )
}
