import { useMemo } from 'react'
import { usePlayerTime } from '@/hooks/usePlayerTime'
import { findActiveCue } from '@/lib/subtitles/findActiveCue'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { ViewMode } from '@/types/theme.types'

interface MobileActiveCaptionProps {
  slices: PairedSlice[]
  getCurrentTime: () => number
  isPlaying: boolean
  viewMode: ViewMode
}

/**
 * شريط مدمج يظهر على شاشات الجوال فقط (lg:hidden) مباشرة أسفل الفيديو،
 * ويعرض *فقط* المقطع النشط حالياً — بلا قائمة قابلة للتمرير إطلاقاً.
 *
 * لماذا هذا المكوّن ضروري: على الجوال، الفيديو هو المحتوى الأساسي ويجب أن
 * يبقى مرئياً دوماً. القائمة الكاملة (TranscriptList) تستخدم scrollIntoView
 * للقفز التلقائي إلى المقطع النشط — سلوك مناسب تماماً داخل لوحة جانبية
 * محصورة الارتفاع على الشاشات الكبيرة، لكنه على الجوال (حيث يتدفق كل شيء
 * عمودياً في صفحة واحدة طويلة) قد يُحرّك تمرير الصفحة نفسها كلما تغيّر
 * المقطع النشط، فيدفع الفيديو خارج منطقة الرؤية. هذا المكوّن يستبدل تلك
 * التجربة على الجوال بعرض السطر الحالي فقط في مكانه الثابت أسفل الفيديو
 * مباشرة — يتحدّث محتواه في مكانه دون أي حركة تمرير على الإطلاق.
 *
 * يُعاد استخدام نفس بنية "الشرائح" الموحّدة (PairedSlice) التي تراعي
 * إزاحة المزامنة بالفعل (انظر pairCues.ts)، فيبقى هذا العرض متطابقاً تماماً
 * مع توقيت الترجمة المحروقة فوق الفيديو (SubtitleOverlay) دون أي ازدواجية
 * في منطق التزامن
 */
export function MobileActiveCaption({ slices, getCurrentTime, isPlaying, viewMode }: MobileActiveCaptionProps) {
  const currentTime = usePlayerTime(getCurrentTime, isPlaying)

  const activeSlice = useMemo(() => findActiveCue(slices, currentTime), [slices, currentTime])

  // لا نعرض الشريط إطلاقاً قبل رفع أي ملف ترجمة — لا فائدة من صندوق فارغ
  if (slices.length === 0) return null

  const showSource = viewMode !== 'translation' && activeSlice?.sourceText
  const showTranslation = viewMode !== 'source' && activeSlice?.translationText

  return (
    <div
      data-testid="mobile-active-caption"
      className="flex min-h-[76px] flex-col justify-center gap-1.5 border-b border-border bg-surface px-4 py-3 lg:hidden"
    >
      {activeSlice ? (
        <>
          {showSource && (
            <p dir="auto" className="text-[13px] italic leading-snug text-text-secondary">
              {activeSlice.sourceText}
            </p>
          )}
          {showTranslation && (
            <p dir="auto" className="text-[17px] font-semibold leading-snug text-text-primary">
              {activeSlice.translationText}
            </p>
          )}
        </>
      ) : (
        <p className="font-mono text-[11px] tracking-wide text-text-muted">···</p>
      )}
    </div>
  )
}
