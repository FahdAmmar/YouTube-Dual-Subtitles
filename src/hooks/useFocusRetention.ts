import { useEffect, type RefObject } from 'react'

/**
 * يضمن بقاء التركيز (focus) داخل حاوية المرحلة بدل ابتلاع الـ iframe
 * (يوتيوب) له بعد النقر عليه — وهو السبب الجذري لعدم استجابة اختصارات
 * لوحة المفاتيح أحياناً: عندما يأخذ الـ iframe التركيز، تُرسَل أحداث
 * لوحة المفاتيح إلى مستند الـ iframe المنعزل (cross-origin) ولا تصل إلى
 * window الأب إطلاقاً (الأحداث لا تفقّع عبر حدود المستندات)، فلا تُلتقط
 * من useKeyboardShortcuts مهما كانت مرتبطةً بـ window.
 *
 * لماذا focusin على document وليس pointerup: النقرة التي تسرق التركيز
 * تقع فعلياً *داخل* محتوى الـ iframe — أي في مستند منعزل مختلف تماماً —
 * فحدث pointerup الناتج عنها لا يصل إطلاقاً إلى مستند الصفحة الأب (لا
 * تفقّع عبر حدود المستندات). أما تركيز عنصر iframe نفسه فهو حالة تخص
 * document.activeElement في المستند الأب مباشرة، ويُصدر عنه حدث focusin
 * (يصعد خلافاً لـ focus) يلتقطه المستمع هنا بدقة وفوراً بمجرد وقوعه.
 *
 * ملاحظة: هذا لا يُعطّل أي تفاعل مع الفيديو نفسه (النقر للتشغيل يبقى
 * يعمل، لأنه يُعالَج بالكامل داخل مستند الـ iframe المستقل)، بل يضمن
 * فقط أن التركيز في المستند الأب يعود فوراً لاختصاراتنا بعده.
 */
export function useFocusRetention(stageRef: RefObject<HTMLElement>, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const stage = stageRef.current
    if (!stage) return

    function reclaimFocus(event: FocusEvent) {
      const target = event.target
      if (!(target instanceof HTMLElement) || target.tagName !== 'IFRAME') return
      try {
        stage?.focus({ preventScroll: true })
      } catch {
        // بعض المتصفحات القديمة لا تدعم preventScroll — تجاهل بأمان
        stage?.focus()
      }
    }

    // focusin (بخلاف focus) يصعد عبر الشجرة، فيلتقطه مستمع document واحد
    // بغض النظر عن مكان الـ iframe داخل الصفحة
    document.addEventListener('focusin', reclaimFocus)
    return () => document.removeEventListener('focusin', reclaimFocus)
  }, [enabled, stageRef])
}
