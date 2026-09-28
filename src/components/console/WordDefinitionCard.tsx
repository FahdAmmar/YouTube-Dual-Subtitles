import { useCallback, useEffect, useState } from 'react'
import { X, BookmarkPlus, BookmarkCheck, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import { lookupWord, type LookupOutcome } from '@/lib/utils/wordLookup'
import { useGlossary } from '@/hooks/useGlossary'

interface WordDefinitionCardProps {
  word: string
  /** لغة الكلمة (لغة التعلّم) */
  languageCode: string
  /** لغة المستخدم (المسار المرجعي) لعرض الترجمة إليها */
  nativeLanguageCode?: string
  onClose: () => void
}

type CardState = { kind: 'loading' } | LookupOutcome

/**
 * بطاقة معنى كلمة واحدة تُعرض أسفل المقطع بعد النقر عليها. مكوّن مستقل
 * (لا جزء من SliceCard) كي يُحمَّل useGlossary وقراءة localStorage فقط
 * عند نقرة فعلية، لا مع كل بطاقة في قائمة قد تضم آلاف المقاطع
 */
export function WordDefinitionCard({ word, languageCode, nativeLanguageCode, onClose }: WordDefinitionCardProps) {
  const [state, setState] = useState<CardState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const glossary = useGlossary()

  useEffect(() => {
    const controller = new AbortController()
    setState({ kind: 'loading' })

    lookupWord(word, languageCode, nativeLanguageCode, controller.signal).then((outcome) => {
      if (!controller.signal.aborted) setState(outcome)
    })

    return () => controller.abort()
  }, [word, languageCode, nativeLanguageCode, attempt])

  const retry = useCallback(() => setAttempt((previous) => previous + 1), [])
  const isSaved = glossary.hasEntry(word, languageCode)

  // رابط احتياطي خارجي حين لا نجد شيئاً: المستخدم لا يبقى بلا مخرج
  const fallbackUrl = `https://translate.google.com/?sl=${encodeURIComponent(languageCode)}&tl=${encodeURIComponent(
    nativeLanguageCode ?? 'ar',
  )}&text=${encodeURIComponent(word)}&op=translate`

  return (
    <div
      // البطاقة تقع فوق زر القفز الخاص بالمقطع؛ إيقاف الانتشار يمنع قفزاً غير مقصود
      onClick={(event) => event.stopPropagation()}
      className="flex flex-col gap-2 rounded-md border border-border bg-surface-elevated p-2.5 text-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-text-primary" dir="auto">
          {word}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق بطاقة التعريف"
          className="shrink-0 rounded-sm text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {state.kind === 'loading' && (
        <div className="flex items-center gap-1.5 text-xs text-text-muted" role="status">
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          <span>جارٍ البحث…</span>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-text-muted">تعذّر جلب المعنى (تحقق من الاتصال بالإنترنت، أو قد تكون الحصة اليومية للخدمة انتهت)</p>
          <button
            type="button"
            onClick={retry}
            className="flex w-fit items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs font-medium text-console transition-colors hover:bg-console/10"
          >
            <RefreshCw size={12} aria-hidden="true" />
            إعادة المحاولة
          </button>
        </div>
      )}

      {state.kind === 'not-found' && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-text-muted">لم نعثر على معنى لهذه الكلمة في المصادر المتاحة</p>
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs font-medium text-console transition-colors hover:bg-console/10"
          >
            <ExternalLink size={12} aria-hidden="true" />
            البحث في مترجم جوجل
          </a>
        </div>
      )}

      {state.kind === 'found' && (
        <>
          {state.result.translation && (
            <div className="flex flex-col gap-0.5">
              <p className="text-base font-semibold text-console" dir="auto">
                {state.result.translation}
              </p>
              {state.result.alternatives.length > 0 && (
                <p className="text-xs text-text-muted" dir="auto">
                  أو: {state.result.alternatives.join(' · ')}
                </p>
              )}
            </div>
          )}

          {state.result.meanings.map((meaning) => (
            <div key={`${meaning.partOfSpeech}-${meaning.text}`} className="flex flex-col gap-0.5">
              {meaning.partOfSpeech && (
                <span className="w-fit rounded-sm bg-console/10 px-1.5 py-0.5 font-mono text-[10px] text-console">
                  {meaning.partOfSpeech}
                </span>
              )}
              <p className="text-text-secondary" dir="auto">
                {meaning.text}
              </p>
              {meaning.example && (
                <p className="italic text-text-muted" dir="auto">
                  «{meaning.example}»
                </p>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              if (isSaved) return
              const firstMeaning = state.result.meanings[0]
              glossary.addEntry({
                word: state.result.word,
                languageCode,
                partOfSpeech: firstMeaning?.partOfSpeech ?? '',
                translation: state.result.translation,
                definition: firstMeaning?.text ?? '',
                example: firstMeaning?.example ?? null,
              })
            }}
            disabled={isSaved}
            className="mt-1 flex w-fit items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs font-medium text-console transition-colors disabled:text-text-muted enabled:hover:bg-console/10"
          >
            {isSaved ? <BookmarkCheck size={13} aria-hidden="true" /> : <BookmarkPlus size={13} aria-hidden="true" />}
            {isSaved ? 'أُضيفت إلى المفردات' : 'أضف إلى المفردات'}
          </button>
        </>
      )}
    </div>
  )
}
