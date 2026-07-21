import { useEffect } from 'react'

export interface KeyboardShortcutHandlers {
  onTogglePlayPause: () => void
  onSpeedUp: () => void
  onSlowDown: () => void
  onToggleFullscreen: () => void
  onResetSpeed: () => void
  onPrevScene: () => void
  onNextScene: () => void
  onVolumeUp: () => void
  onVolumeDown: () => void
  /** إعادة تشغيل المقطع الحالي من بدايته — اختصار "0" */
  onRestartScene: () => void
  /** تكرار المقطع الحالي N مرات — اختصارات "1"/"2"/"3" */
  onRepeatScene: (totalLoops: number) => void
}

/**
 * هل الحدث صادر من عنصر إدخال نصي (حقل نص، منطقة نص، قائمة منسدلة، أو
 * عنصر قابل للتحرير)؟ نتجاهل الاختصارات تماماً في هذه الحالة، وإلا لكانت
 * كتابة حرف "c" أو "x" أو الضغط على مسافة أثناء تعديل عنوان الفيديو مثلاً
 * تُسرّع الفيديو أو تُشغّله/توقفه بدل إدخال الحرف المقصود فعلياً
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

/**
 * اختصارات لوحة مفاتيح خاصة بمشاهدة الفيديو، مفعّلة فقط عند enabled=true
 * (أي عندما يكون هناك فيديو محمَّل فعلياً في المرحلة الثانية من التطبيق)
 *
 * ملاحظة تصميم مهمة: هذه الاختصارات منفصلة تماماً عن لوحة مفاتيح يوتيوب
 * الأصلية (المُعطَّلة صراحةً عبر disablekb: 1 في useYouTubePlayer)، فلا
 * يوجد أي تعارض أو ازدواجية في المعالجة.
 *
 * - مسافة: تشغيل/إيقاف مؤقت
 * - c: تسريع التشغيل بمقدار 0.5×
 * - x: إبطاء التشغيل بمقدار 0.5×
 * - f: تبديل وضع ملء الشاشة
 * - z: إعادة السرعة للطبيعية (1×)
 * - ArrowLeft/Right: المقطع السابق/التالي
 * - ArrowUp/Down: رفع/خفض الصوت
 * - 0: إعادة تشغيل المقطع الحالي من بدايته (مرة واحدة)
 * - 1: تكرار المقطع الحالي مرّتين
 * - 2: تكرار المقطع الحالي ثلاث مرات
 * - 3: تكرار المقطع الحالي أربع مرات
 *
 * كل الاختصارات تتجاهل ضغطات المفاتيح المصحوبة بـ Ctrl/Cmd/Alt (لتفادي
 * تعارضها مع اختصارات المتصفح)، وتُتجاهَل بالكامل أثناء الكتابة في أي حقل
 * إدخال (انظر isTypingTarget)
 *
 * ملاحظة موثوقية: المُستمع يُربَط في طور الالتقاط (capture: true) كإجراء
 * دفاعي — يضمن إطلاق المعالج حتى لو استدعى أحد العناصر الابنة stopPropagation
 * في طور التفقيع. هذا لا يُعالج وحده مشكلة ابتلاع iframe يوتيوب للتركيز
 * (الأحداث لا تفقّع عبر حدود المستندات أصلاً)، لكن useFocusRetention تتولى
 * استعادة التركيز من الـ iframe بعد كل تفاعل، فيبقى هذا المُستمع فعّالاً
 */
export function useKeyboardShortcuts(
  enabled: boolean,
  {
    onTogglePlayPause,
    onSpeedUp,
    onSlowDown,
    onToggleFullscreen,
    onResetSpeed,
    onPrevScene,
    onNextScene,
    onVolumeUp,
    onVolumeDown,
    onRestartScene,
    onRepeatScene,
  }: KeyboardShortcutHandlers,
): void {
  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      switch (event.key) {
        case ' ':
        case 'Spacebar':
          event.preventDefault()
          onTogglePlayPause()
          break
        case 'c':
        case 'C':
          event.preventDefault()
          onSpeedUp()
          break
        case 'x':
        case 'X':
          event.preventDefault()
          onSlowDown()
          break
        case 'f':
        case 'F':
          event.preventDefault()
          onToggleFullscreen()
          break
        case 'z':
        case 'Z':
          event.preventDefault()
          onResetSpeed()
          break
        case 'ArrowLeft':
          event.preventDefault()
          onPrevScene()
          break
        case 'ArrowRight':
          event.preventDefault()
          onNextScene()
          break
        case 'ArrowUp':
          event.preventDefault()
          onVolumeUp()
          break
        case 'ArrowDown':
          event.preventDefault()
          onVolumeDown()
          break
        case '0':
          event.preventDefault()
          onRestartScene()
          break
        case '1':
          event.preventDefault()
          onRepeatScene(2)
          break
        case '2':
          event.preventDefault()
          onRepeatScene(3)
          break
        case '3':
          event.preventDefault()
          onRepeatScene(4)
          break
        default:
          break
      }
    }

    // capture: true كإجراء دفاعي: يلتقط الحدث في طور الالتقاط قبل وصوله
    // للهدف، فيضمن إطلاق المعالج حتى لو استدعى أحد العناصر الابنة stopPropagation
    const options: AddEventListenerOptions = { capture: true }
    window.addEventListener('keydown', handleKeyDown, options)
    return () => window.removeEventListener('keydown', handleKeyDown, options)
  }, [
    enabled,
    onTogglePlayPause,
    onSpeedUp,
    onSlowDown,
    onToggleFullscreen,
    onResetSpeed,
    onPrevScene,
    onNextScene,
    onVolumeUp,
    onVolumeDown,
    onRestartScene,
    onRepeatScene,
  ])
}
