import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { KEYBOARD_SHORTCUTS } from '@/constants/keyboardShortcuts'

interface KeyboardShortcutsPanelProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * لوحة مرجعية بسيطة تسرد كل اختصارات لوحة المفاتيح الخاصة بالفيديو —
 * تحلّ مشكلة قابلية الاكتشاف (لا توجد أي طريقة أخرى لمعرفة هذه
 * الاختصارات داخل الواجهة). القائمة مصدرها KEYBOARD_SHORTCUTS مباشرة
 * (نفس المصدر الذي يعالج به useKeyboardShortcuts الضغطات الفعلية)، فلا
 * يوجد أي احتمال لتعارض بين ما يُعرَض هنا وما يعمل فعلياً. محتوى ثابت
 * بالكامل بلا حالة داخلية، فلا حاجة لتحميلها كسولاً (بخلاف SettingsPanel الأثقل)
 */
export function KeyboardShortcutsPanel({ isOpen, onClose }: KeyboardShortcutsPanelProps) {
  const dialogRef = useDialogFocusTrap(isOpen, onClose)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'tween', duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-label="اختصارات لوحة المفاتيح"
            tabIndex={-1}
            className="fixed inset-0 z-50 m-auto h-fit max-h-[85vh] w-[calc(100%-1.5rem)] max-w-sm overflow-y-auto p-0 outline-none sm:max-w-md"
          >
            <Card className="flex flex-col gap-4 p-5 shadow-elevated">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
                  <Keyboard size={18} aria-hidden="true" />
                  اختصارات لوحة المفاتيح
                </h2>
                <IconButton aria-label="إغلاق لوحة الاختصارات" onClick={onClose}>
                  <X size={19} aria-hidden="true" />
                </IconButton>
              </div>

              <ul className="flex flex-col gap-0.5">
                {KEYBOARD_SHORTCUTS.map((shortcut) => (
                  <li
                    key={shortcut.description}
                    className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5 text-sm text-text-secondary"
                  >
                    <span>{shortcut.description}</span>
                    <kbd className="shrink-0 rounded-sm border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-text-primary">
                      {shortcut.displayKey}
                    </kbd>
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
