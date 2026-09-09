import { useEffect, useRef } from 'react'
import { KEYBOARD_SHORTCUTS, type KeyboardShortcutHandlers } from '@/constants/keyboardShortcuts'

export type { KeyboardShortcutHandlers }

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
 * (أي عندما يكون هناك فيديو محمَّل فعلياً في المرحلة الثانية من التطبيق).
 * قائمة الاختصارات نفسها معرَّفة مرة واحدة في KEYBOARD_SHORTCUTS (يشاركها
 * KeyboardShortcutsPanel لعرضها) — هذا الملف مسؤول فقط عن ربطها بأحداث
 * لوحة المفاتيح الفعلية.
 *
 * ملاحظة تصميم مهمة: هذه الاختصارات منفصلة تماماً عن لوحة مفاتيح يوتيوب
 * الأصلية (المُعطَّلة صراحةً عبر disablekb: 1 في useYouTubePlayer)، فلا
 * يوجد أي تعارض أو ازدواجية في المعالجة.
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
export function useKeyboardShortcuts(enabled: boolean, handlers: KeyboardShortcutHandlers): void {
  // handlersRef بدل تمرير handlers كاعتماد مباشر: عدة معالجات (مثل
  // onTogglePlayPause) تتغيّر مرجعيتها مع كل تبديل تشغيل/إيقاف، فربطها
  // كاعتماد كان سيُعيد بناء مُستمع window في كل مرة — بدل ذلك، المُستمع
  // يُبنى مرة واحدة فقط طالما enabled ثابتة، ويقرأ أحدث المعالجات دوماً
  // عبر المرجع (نفس نمط playerRef المستخدَم في بقية الخطّافات)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      const shortcut = KEYBOARD_SHORTCUTS.find((entry) => entry.matchKeys.includes(event.key))
      if (!shortcut) return

      event.preventDefault()
      shortcut.action(handlersRef.current)
    }

    // capture: true كإجراء دفاعي: يلتقط الحدث في طور الالتقاط قبل وصوله
    // للهدف، فيضمن إطلاق المعالج حتى لو استدعى أحد العناصر الابنة stopPropagation
    const options: AddEventListenerOptions = { capture: true }
    window.addEventListener('keydown', handleKeyDown, options)
    return () => window.removeEventListener('keydown', handleKeyDown, options)
  }, [enabled])
}
