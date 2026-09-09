import { useEffect, useRef, type RefObject } from 'react'

/**
 * سلوك حوار قياسي (WAI-ARIA Dialog Pattern) مشترك لأي حوار منبثق في
 * التطبيق: عند الفتح، نحفظ العنصر الذي كان يملك التركيز وننقل التركيز
 * داخل الحوار؛ Escape يُغلقه؛ وعند الإغلاق نُعيد التركيز إلى مكانه الأصلي
 * بدل تركه "ضائعاً" على body.
 *
 * مستخرج من SettingsPanel ليُعاد استخدامه في أي حوار جديد (مثل لوحة
 * اختصارات لوحة المفاتيح) دون تكرار نفس المنطق حرفياً (DRY)
 */
export function useDialogFocusTrap(isOpen: boolean, onClose: () => void): RefObject<HTMLDivElement> {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    const frame = requestAnimationFrame(() => dialogRef.current?.focus())

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedRef.current?.focus?.()
    }
  }, [isOpen, onClose])

  return dialogRef
}
