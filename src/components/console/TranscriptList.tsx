import { useEffect, useMemo, useRef } from 'react'
import { usePlayerTime } from '@/hooks/usePlayerTime'
import { findActiveCue } from '@/lib/subtitles/findActiveCue'
import { SliceCard } from './SliceCard'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { ViewMode } from '@/types/theme.types'

interface TranscriptListProps {
  slices: PairedSlice[]
  getCurrentTime: () => number
  isPlaying: boolean
  viewMode: ViewMode
  onSeek: (seconds: number) => void
}

/**
 * لوحة النص المتزامن الكاملة — تعرض كل مقاطع الفيديو مرتبة زمنياً، مع
 * تمييز المقطع الموافق للحظة الحالية من التشغيل، والتمرير التلقائي إليه
 * بحيث يبقى ظاهراً دوماً وسط المقاطع السابقة واللاحقة (تحقيق مباشر لمتطلب
 * "قراءة النص السابق والتالي" — القارئ يرى السياق كاملاً وليس السطر
 * الحالي فقط، خلافاً للترجمة المُطبَّقة فوق الفيديو التي تعرض سطراً واحداً)
 *
 * ملاحظة أداء: يشترك هذا المكوّن في تحديثات الوقت عبر usePlayerTime
 * بمعزل عن بقية الشجرة، تماماً مثل SubtitleOverlay و VideoControlBar
 */
export function TranscriptList({ slices, getCurrentTime, isPlaying, viewMode, onSeek }: TranscriptListProps) {
  const currentTime = usePlayerTime(getCurrentTime, isPlaying)
  const activeSlice = useMemo(() => findActiveCue(slices, currentTime), [slices, currentTime])

  const activeItemRef = useRef<HTMLButtonElement>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // تمرير سلس للمقطع النشط إلى منتصف منطقة الرؤية، فقط عند تغيّره فعلياً
    // (وليس عند كل نبضة وقت) لتفادي "قفزات" تمرير مزعجة أثناء المشاهدة
    //
    // إصلاح خطأ حرج ثانٍ (Bug Fix): الاستدعاء المباشر لـ scrollIntoView كان
    // غير محمي — الشرط ?. يتحقق فقط من أن activeItemRef.current ليس null،
    // لكنه لا يتحقق من أن الدالة scrollIntoView نفسها متاحة وصالحة فعلياً
    // كدالة قابلة للاستدعاء. في بعض بيئات التشغيل (متصفحات مضمّنة داخل
    // تطبيقات أخرى، أطر iframe معاينة مقيّدة، أو تطبيقات ويب تفاعلية خفيفة
    // الوزن) قد لا تُنفَّذ هذه الواجهة بالكامل. وبما أن هذا الاستدعاء يقع
    // داخل useEffect، فإن أي استثناء ينتج عنه يصل مباشرة إلى ErrorBoundary
    // الجذري ويستبدل الصفحة كاملة بشاشة الخطأ العامة — واللحظة التي يحدث
    // فيها هذا لأول مرة هي بالتحديد لحظة ظهور أول مقطع "نشط" بعد رفع ملف
    // ترجمة وبدء التشغيل، ما يفسّر ظهور الخطأ بعد رفع الملفات تحديداً.
    // التحقق من النوع + التغليف بـ try/catch (بنفس نمط الحماية المُتّبع في
    // useLocalStorage وuseFullscreen) يمنع توقف التطبيق مهما كانت البيئة
    const target = activeItemRef.current
    if (target && typeof target.scrollIntoView === 'function') {
      requestAnimationFrame(() => {
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } catch {
          // تجاهل بأمان
        }
      })
    }
  }, [activeSlice?.id])

  if (slices.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <p className="font-mono text-xs leading-relaxed text-text-muted">
          [ NO_TRANSCRIPT_DATA ]
          <br />
          ارفع ملف ترجمة واحداً على الأقل لعرض النص هنا
        </p>
      </div>
    )
  }

  return (
    <div ref={listContainerRef} className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
      {slices.map((slice, index) => {
        const isActive = activeSlice?.id === slice.id
        // نسبة التقدّم داخل المقطع النشط فقط — تبقى undefined لكل البطاقات
        // الأخرى (قيمة مستقرة بين عمليات إعادة الرسم) حتى لا تُبطل فائدة
        // React.memo في SliceCard لأي بطاقة غير نشطة
        const activeProgressPercent = isActive
          ? Math.min(
              100,
              Math.max(0, ((currentTime - slice.start) / Math.max(slice.end - slice.start, 0.001)) * 100),
            )
          : undefined

        return (
          <SliceCard
            key={slice.id}
            ref={isActive ? activeItemRef : undefined}
            slice={slice}
            index={index}
            isActive={isActive}
            viewMode={viewMode}
            onSeek={onSeek}
            activeProgressPercent={activeProgressPercent}
          />
        )
      })}
    </div>
  )
}
