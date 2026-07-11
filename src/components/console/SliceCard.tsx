import { forwardRef, memo } from 'react'
import { cn } from '@/lib/utils/cn'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { ViewMode } from '@/types/theme.types'

interface SliceCardProps {
  slice: PairedSlice
  index: number
  isActive: boolean
  viewMode: ViewMode
  onSeek: (seconds: number) => void
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
  { slice, index, isActive, viewMode, onSeek, activeProgressPercent }: SliceCardProps,
  ref: React.ForwardedRef<HTMLButtonElement>,
) {
  const showSource = viewMode !== 'translation' && slice.sourceText
  const showTranslation = viewMode !== 'source' && slice.translationText

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSeek(slice.start)}
      aria-current={isActive ? 'true' : undefined}
      className={cn(
        'flex w-full flex-col gap-2 rounded-md border-s-2 px-3.5 py-3.5 text-start transition-colors duration-150',
        isActive
          ? 'border-console bg-console/[0.07] shadow-glow-console'
          : 'border-transparent hover:bg-surface-elevated',
      )}
    >
      <div className="flex items-center gap-2">
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

      {/* النص الأجنبي الأساسي — أكبر وأوضح، هو محور القراءة أثناء المتابعة */}
      {showTranslation && (
        <p
          dir="auto"
          className={cn(
            'text-[17px] font-semibold leading-snug',
            isActive ? 'text-text-primary' : 'text-text-secondary',
          )}
        >
          {slice.translationText}
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
