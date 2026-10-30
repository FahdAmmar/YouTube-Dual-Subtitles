import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Eye, MapPin, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getIntervalLabel, getReviewQueue } from '@/lib/utils/spacedRepetition'
import { isTypingTarget } from '@/lib/utils/isTypingTarget'
import { isSpeechSupported, speakText } from '@/lib/utils/textToSpeech'
import { getValidContext, makeCloze } from '@/lib/utils/glossaryContext'
import { formatClock } from '@/lib/utils/formatClock'
import type { GlossaryEntry, ReviewGrade } from '@/types/glossary.types'

interface GlossaryReviewProps {
  entries: GlossaryEntry[]
  currentVideoKey: string | null
  /** Most never-reviewed words this session may bring in; null for no limit */
  newCardLimit: number | null
  onGrade: (id: string, grade: ReviewGrade) => void
  onSeekToTime?: (seconds: number) => void
  onExit: () => void
}

const GRADES: { grade: ReviewGrade; label: string; key: string; className: string }[] = [
  { grade: 'again', label: 'لم أتذكرها', key: '1', className: 'border-red-500/50 text-error hover:bg-red-500/5' },
  { grade: 'good', label: 'تذكرتها', key: '2', className: 'border-console/60 text-text-primary hover:bg-console/10' },
  { grade: 'easy', label: 'سهلة', key: '3', className: 'border-track-b/60 text-text-primary hover:bg-track-b/10' },
]

/** The number row of an Arabic keyboard layout types Arabic-Indic digits, so those work as well */
const GRADE_BY_KEY: Record<string, ReviewGrade | undefined> = {
  '1': 'again',
  '2': 'good',
  '3': 'easy',
  '١': 'again',
  '٢': 'good',
  '٣': 'easy',
}

interface SessionAnswer {
  id: string
  grade: ReviewGrade
}

/** One pass over the words that are due. The queue is fixed when the session starts. */
export function GlossaryReview({
  entries,
  currentVideoKey,
  newCardLimit,
  onGrade,
  onSeekToTime,
  onExit,
}: GlossaryReviewProps) {
  const [queueIds] = useState(() => getReviewQueue(entries, Date.now(), newCardLimit).map((entry) => entry.id))
  const [position, setPosition] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [answers, setAnswers] = useState<SessionAnswer[]>([])

  const entry = useMemo(
    () => entries.find((candidate) => candidate.id === queueIds[position]) ?? null,
    [entries, queueIds, position],
  )

  const isFinished = position >= queueIds.length || entry === null

  function answer(grade: ReviewGrade) {
    if (!entry) return
    onGrade(entry.id, grade)
    setAnswers((previous) => [...previous, { id: entry.id, grade }])
    setIsRevealed(false)
    setPosition((previous) => previous + 1)
  }

  // The handler is re-bound on every change of what a key means (hidden vs shown answer), but always calls
  // the newest answer(): it closes over the current word
  const answerRef = useRef(answer)
  answerRef.current = answer

  useEffect(() => {
    if (isFinished) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return
      if (!isRevealed) {
        // On a focused button the browser already turns Space/Enter into a click: do not act twice
        const isOnButton = event.target instanceof HTMLButtonElement
        if ((event.key === ' ' || event.key === 'Enter') && !isOnButton) {
          event.preventDefault()
          setIsRevealed(true)
        }
        return
      }
      const grade = GRADE_BY_KEY[event.key]
      if (grade) {
        event.preventDefault()
        answerRef.current(grade)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFinished, isRevealed])

  if (isFinished) {
    const countOf = (grade: ReviewGrade) => answers.filter((item) => item.grade === grade).length
    const forgottenWords = answers
      .filter((item) => item.grade === 'again')
      .map((item) => entries.find((candidate) => candidate.id === item.id)?.word)
      .filter((word): word is string => Boolean(word))

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
        {answers.length > 0 && (
          <ul
            data-testid="review-summary"
            className="flex w-full justify-center gap-4 text-xs text-text-secondary"
            aria-label="ملخص الجلسة"
          >
            {GRADES.map(({ grade, label }) => (
              <li key={grade}>
                {label}: {countOf(grade)}
              </li>
            ))}
          </ul>
        )}
        {forgottenWords.length > 0 && (
          <p data-testid="review-forgotten" className="max-w-full text-sm text-text-secondary">
            ستعود إليك بعد دقائق:{' '}
            {forgottenWords.map((word, index) => (
              <span key={word}>
                {index > 0 && '، '}
                <bdi className="font-semibold text-text-primary">{word}</bdi>
              </span>
            ))}
          </p>
        )}
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
          className="flex items-center gap-1 rounded-sm text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console"
        >
          <ArrowRight size={13} aria-hidden="true" />
          القائمة
        </button>
        <span className="font-mono tabular-nums" dir="ltr">
          {position + 1} / {queueIds.length}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="تقدّم المراجعة"
        aria-valuemin={0}
        aria-valuemax={queueIds.length}
        aria-valuenow={position}
        className="h-1.5 overflow-hidden rounded-full bg-border"
      >
        <div
          className="h-full rounded-full bg-console transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${(position / queueIds.length) * 100}%` }}
        />
      </div>

      <div className="relative flex min-h-44 flex-col justify-center gap-3 rounded-lg border border-border bg-surface-elevated p-5">
        {isSpeechSupported() && (
          <button
            type="button"
            onClick={() => speakText(entry.word, entry.languageCode)}
            aria-label="نطق الكلمة"
            className="absolute inset-e-3 top-3 rounded-sm p-1 text-text-secondary transition-colors hover:text-console focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console"
          >
            <Volume2 size={16} aria-hidden="true" />
          </button>
        )}
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
              <p className="text-sm text-text-muted" dir="auto">
                «{context.sentence}»
              </p>
            )}
            {canJump && (
              <button
                type="button"
                onClick={() => onSeekToTime?.(context.time)}
                className="flex w-fit items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs font-medium text-console hover:bg-console/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console"
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
          {GRADES.map(({ grade, label, key, className }) => (
            <button
              key={grade}
              type="button"
              onClick={() => answer(grade)}
              aria-keyshortcuts={key}
              className={`flex flex-col items-center gap-0.5 rounded-md border px-2 py-2.5 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console ${className}`}
            >
              {label}
              <span className="font-mono text-xs leading-5 text-text-secondary">
                {getIntervalLabel(entry, grade)}
                <span aria-hidden="true">
                  {' · '}
                  <kbd className="font-mono">{key}</kbd>
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <Button onClick={() => setIsRevealed(true)} aria-keyshortcuts="Space Enter">
            <Eye size={15} aria-hidden="true" />
            إظهار الإجابة
          </Button>
          <p aria-hidden="true" className="text-center text-xs text-text-muted">
            أو اضغط <kbd className="font-mono">Space</kbd>
          </p>
        </>
      )}
    </div>
  )
}
