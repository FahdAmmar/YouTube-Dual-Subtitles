import { forwardRef, memo, useState, type MouseEvent } from 'react'
import { Star, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { getVisibleTracks } from '@/lib/subtitles/visibleTracks'
import { isSpeechSupported, speakText } from '@/lib/utils/textToSpeech'
import { tokenizeIntoWords, isWhitespaceToken, stripSurroundingPunctuation } from '@/lib/utils/wordTokenize'
import { WordDefinitionCard } from './WordDefinitionCard'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { ViewMode } from '@/types/theme.types'

interface SliceCardProps {
  slice: PairedSlice
  index: number
  isActive: boolean
  viewMode: ViewMode
  /** Recall mode only: has this segment's translation been revealed? */
  isTranslationRevealed?: boolean
  isBookmarked?: boolean
  onToggleBookmark?: (slice: PairedSlice) => void
  onSeek: (seconds: number) => void
  /** رمز لغة المسار الأجنبي (ISO 639-1) — يُمرَّر لمحرّك النطق ليختار صوتاً مناسباً */
  translationLang?: string
  /** رمز لغة المسار المرجعي — يُستخدم للنطق فقط عند غياب نص الترجمة الأجنبية في هذا المقطع */
  sourceLang?: string
  /**
   * نسبة التقدّم (0–100) داخل المقطع النشط حالياً فقط — غير محدَّدة لبقية
   * البطاقات دوماً. تغذّي مؤشر الإبراز الحي أسفل البطاقة (انظر التعليق
   * أسفل مكوّن التصدير) دون التأثير على أي بطاقة أخرى
   */
  activeProgressPercent?: number
}

/** تنسيق الثواني إلى "دقائق:ثواني" لعرضها كرقم تسلسلي زمني صغير بجانب كل مقطع */
function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * بطاقة مقطع واحد داخل قائمة النص المتزامن (Transcript)
 *
 * تستخدم forwardRef لأن القائمة الأم (TranscriptList) تحتاج مرجعاً مباشراً
 * للبطاقة النشطة حالياً لتنفيذ التمرير التلقائي (scrollIntoView) إليها —
 * هذا ما يحقق متطلب "قراءة النص السابق والتالي" بوضوح: الشريط النشط يبقى
 * مرئياً دوماً وسط سياق المقاطع المجاورة له بدل الاختفاء خارج نطاق الرؤية
 *
 * التراتبية البصرية (مطابقة لـ SubtitleOverlay فوق الفيديو): نص الترجمة
 * الأجنبية هو المحتوى الأساسي المُتابَع أثناء القراءة، فيُعرض بخط عريض
 * وحجم أكبر؛ بينما النص العربي مرجعي مساند بحجم أصغر — إضافة إلى أن هذا
 * يمنح "قسم النص" ككل حضوراً أوضح وأكبر مقارنة بالتصميم السابق
 */
function SliceCardImpl(
  {
    slice,
    index,
    isActive,
    viewMode,
    isTranslationRevealed = false,
    isBookmarked = false,
    onToggleBookmark,
    onSeek,
    translationLang,
    sourceLang,
    activeProgressPercent,
  }: SliceCardProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const visibleTracks = getVisibleTracks(viewMode, isTranslationRevealed)
  const showSource = visibleTracks.source && slice.sourceText
  const showTranslation = visibleTracks.translation && slice.translationText
  const isTranslationHidden = viewMode === 'recall' && !isTranslationRevealed && Boolean(slice.translationText)

  // النص المُراد نطقه: النص الأجنبي أولاً (هدف تعلّم اللغة الأساسي)، وإلا
  // النص المرجعي — بحسب ما هو ظاهر فعلياً في وضع العرض الحالي (viewMode)
  const speakableText = showTranslation ? slice.translationText : showSource ? slice.sourceText : null
  const speakableLang = showTranslation ? translationLang : sourceLang
  const canSpeak = isSpeechSupported() && Boolean(speakableText)

  // البحث عن معنى كلمة مُتاح فقط للنص الأجنبي (هدف تعلّم اللغة)، وفقط حين
  // يُعرَف رمز لغته — القاموس المستخدَم (dictionaryapi.dev) يحتاج رمز
  // لغة صريحاً لكل طلب بحث
  const canLookupWords = Boolean(translationLang)
  const [activeLookupWord, setActiveLookupWord] = useState<string | null>(null)

  function handleWordClick(event: MouseEvent, rawToken: string) {
    // إيقاف الانتشار: الكلمة عنصر داخل زر القفز الأب، والنقر عليها يجب أن
    // يفتح بطاقة التعريف فقط، لا أن "يُسرّب" قفزاً غير مقصود للفيديو أيضاً
    event.stopPropagation()
    const cleanedWord = stripSurroundingPunctuation(rawToken)
    if (!cleanedWord) return
    setActiveLookupWord(cleanedWord)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => onSeek(slice.start)}
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          'flex w-full flex-col gap-2 rounded-md border-s-2 px-3.5 py-3.5 text-start transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.99]',
          isActive
            ? 'border-console bg-console/[0.07] shadow-glow-console animate-glow-pulse motion-reduce:animate-none'
            : 'border-transparent hover:bg-surface-elevated',
        )}
      >
        <div className="flex items-center gap-2 pe-14">
          <span
            className={cn(
              'font-mono text-[10px] tracking-wider',
              isActive ? 'text-console' : 'text-text-muted',
            )}
          >
            SEG_{String(index + 1).padStart(3, '0')}
          </span>
          <span className="font-mono text-[10px] text-text-muted">{formatTimestamp(slice.start)}</span>
        </div>

        {/* النص العربي المرجعي — أصغر وأخف وزناً، ليتوازن بصرياً مع النص الأجنبي الأساسي أدناه */}
        {showSource && (
          <p
            dir="auto"
            className={cn(
              'text-[13px] italic leading-snug',
              isActive ? 'text-text-secondary' : 'text-text-muted',
            )}
          >
            {slice.sourceText}
          </p>
        )}

        {isTranslationHidden && (
          <p className="font-mono text-[11px] tracking-wide text-text-muted">
            ••• الترجمة مخفية
          </p>
        )}

        {/* النص الأجنبي الأساسي — أكبر وأوضح، هو محور القراءة أثناء المتابعة.
            كل كلمة عنصر <span> قابل للنقر منفصل (لا <button>؛ تداخل عنصرَي
            button غير صالح في HTML) لفتح بطاقة تعريفها أسفل المقطع */}
        {showTranslation && (
          <p
            dir="auto"
            className={cn(
              'text-[17px] font-semibold leading-snug',
              isActive ? 'text-text-primary' : 'text-text-secondary',
            )}
          >
            {canLookupWords
              ? tokenizeIntoWords(slice.translationText ?? '').map((token, tokenIndex) =>
                  isWhitespaceToken(token) ? (
                    <span key={tokenIndex}>{token}</span>
                  ) : (
                    <span
                      key={tokenIndex}
                      onClick={(event) => handleWordClick(event, token)}
                      className="cursor-pointer rounded-sm transition-colors hover:bg-console/15 hover:text-console"
                    >
                      {token}
                    </span>
                  ),
                )
              : slice.translationText}
          </p>
        )}

        {/* مؤشر الإبراز الحي: يعرض تقدّم القراءة داخل المقطع النشط لحظياً،
            فيُترجم خاصية "الإبراز" من مجرد تلوين ثابت إلى مؤشر تفاعلي دقيق
            يعكس اللحظة الفعلية ضمن نافذة المقطع الزمنية بأكملها */}
        {isActive && typeof activeProgressPercent === 'number' && (
          <div
            className="h-0.5 w-full overflow-hidden rounded-full bg-console/15"
            role="progressbar"
            aria-label="تقدّم قراءة المقطع الحالي"
            aria-valuenow={Math.round(activeProgressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-console transition-[width] duration-150 ease-linear"
              style={{ width: `${activeProgressPercent}%` }}
            />
          </div>
        )}
      </button>

      {/* زر نطق نص المقطع بصوت الجهاز (Web Speech API) — عنصر شقيق لزر
          القفز أعلاه وليس متداخلاً بداخله (تداخل عنصرَي button غير صالح
          في HTML)، ومموضع فوقه بإحداثيات مطلقة؛ لأنه أعلى ترتيباً بصرياً
          في نفس السياق التراكمي (Stacking Context)، فإن نقرة المستخدم في
          مساحته تصل إليه هو حصراً ولا "تُسرّب" إلى زر القفز أسفله */}
      {onToggleBookmark && (
        <button
          type="button"
          onClick={() => onToggleBookmark(slice)}
          aria-pressed={isBookmarked}
          aria-label={isBookmarked ? 'إزالة هذا المقطع من المفضلة' : 'إضافة هذا المقطع إلى المفضلة'}
          className={cn(
            'absolute end-9 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full transition-opacity duration-150 hover:opacity-100 hover:text-console focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console',
            isBookmarked ? 'text-console opacity-100' : 'text-text-muted opacity-70',
          )}
        >
          <Star size={12} className={isBookmarked ? 'fill-current' : undefined} aria-hidden="true" />
        </button>
      )}

      {canSpeak && speakableText && (
        <button
          type="button"
          onClick={() => speakText(speakableText, speakableLang)}
          aria-label="نطق نص هذا المقطع بصوت الجهاز"
          className="absolute end-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-text-muted opacity-70 transition-opacity duration-150 hover:opacity-100 hover:text-console focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
        >
          <Volume2 size={12} aria-hidden="true" />
        </button>
      )}

      {/* بطاقة تعريف الكلمة المنقورة — عنصر شقيق لزر القفز أيضاً، بنفس منطق
          زر النطق أعلاه، ومموضعة أسفل البطاقة بتدفّق طبيعي (لا إحداثيات
          مطلقة) لأن محتواها متغيّر الطول بحسب طول التعريف الفعلي */}
      {activeLookupWord && translationLang && (
        <div className="mt-1 px-1">
          <WordDefinitionCard
            word={activeLookupWord}
            languageCode={translationLang}
            nativeLanguageCode={sourceLang}
            onClose={() => setActiveLookupWord(null)}
          />
        </div>
      )}
    </div>
  )
}

/**
 * تغليف بـ React.memo: مع قوائم نص طويلة (فيديو مدته ساعتان قد يعني آلاف
 * المقاطع)، وبما أن TranscriptList تُعاد رسمها كل 120ms أثناء التشغيل
 * (انظر usePlayerTime)، فإن عدم التغليف كان يعني إعادة رسم *كل* بطاقة في
 * القائمة عند كل نبضة وقت رغم أن isActive لا يتغيّر إلا لبطاقتين اثنتين
 * فقط (التي تفقد الإبراز والتي تكتسبه). التغليف هنا يجعل React يتجاهل
 * إعادة رسم البطاقات غير المتأثرة تلقائياً (المقارنة الافتراضية الضحلة
 * كافية لأن slice/onSeek يحافظان على نفس المرجع بين نبضات الوقت المتتالية)
 */
export const SliceCard = memo(forwardRef(SliceCardImpl))

SliceCard.displayName = 'SliceCard'
