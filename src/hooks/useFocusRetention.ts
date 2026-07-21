import { useEffect, type RefObject } from 'react'

/**
 * يضمن بقاء التركيز (focus) داخل حاوية المرحلة بدل ابتلاع الـ iframe
 * (يوتيوب) له بعد النقر عليه — وهو السبب الجذري لعدم استجابة اختصارات
 * لوحة المفاتيح أحياناً: عندما يأخذ الـ iframe التركيز، تُرسَل أحداث
 * لوحة المفاتيح إلى مستند الـ iframe المنعزل (cross-origin) ولا تصل إلى
 * window الأب إطلاقاً (الأحداث لا تفقّع عبر حدود المستندات)، فلا تُلتقط
 * من useKeyboardShortcuts مهما كانت مرتبطةً بـ window.
 *
 * الحل: جعل حاوية المرحلة قابلة للتركيز (tabIndex=-1، بلا حلقة تركيز
 * مرئية)، ثم بعد أي تفاعل pointer على المستند نتحقق إن كان التركيز قد
 * انتقل إلى iframe، ونُعيده فوراً إلى حاوية المرحلة. التأخير setTimeout(0)
 * ضروري لكي يُعالَج حدث click على الـ iframe أولاً (تشغيل/إيقاف يوتيوب
 * الافتراضي عند النقر على الفيديو) قبل استعادة التركيز — حتى لا نُعطّل
 * هذا التفاعل المشروع.
 *
 * ملاحظة: هذا لا يُعطّل أي تفاعل مع الفيديو نفسه (النقر للتشغيل يبقى
 * يعمل)، بل يضمن فقط أن لوحة المفاتيح تعود فوراً لاختصاراتنا بعده.
 */
export function useFocusRetention(stageRef: RefObject<HTMLElement>, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const stage = stageRef.current
    if (!stage) return

    function reclaimFocus() {
      const active = document.activeElement
      if (active && active.tagName === 'IFRAME') {
        // التأخير الصفري كافٍ لترك حدث click يُعالَج على الـ iframe أولاً
        // قبل استعادة التركيز — حتى لا نُعطّل نقر التشغيل/الإيقاف في يوتيوب
        setTimeout(() => {
          if (!stage) return
          try {
            stage.focus({ preventScroll: true })
          } catch {
            // بعض المتصفحات القديمة لا تدعم preventScroll — تجاهل بأمان
            stage.focus()
          }
        }, 0)
      }
    }

    // الاستماع على مستوى document: حتى النقرات خارج حدود stage المباشرة قد
    // تترك التركيز في الـ iframe، ونريد استعادته في كل حالة
    document.addEventListener('pointerup', reclaimFocus)
    return () => document.removeEventListener('pointerup', reclaimFocus)
  }, [enabled, stageRef])
}
