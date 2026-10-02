import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BookMarked, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { useGlossary } from '@/hooks/useGlossary'
import { glossaryToCsv } from '@/lib/utils/glossaryExport'
import { downloadTextFile } from '@/lib/subtitles/serializeSRT'

interface GlossaryPanelProps {
  isOpen: boolean
  onClose: () => void
}

function exportFileName(): string {
  return `glossary_${new Date().toISOString().slice(0, 10)}.csv`
}

/**
 * لوحة منزلقة (Drawer) تعرض المفردات الشخصية المحفوظة من بطاقات تعريف
 * الكلمات (انظر WordDefinitionCard) — بنفس نمط SettingsPanel تماماً
 * (نفس الحركة، نفس فخ التركيز) للحفاظ على اتساق تجربة كل اللوحات
 * المنزلقة في التطبيق
 */
export function GlossaryPanel({ isOpen, onClose }: GlossaryPanelProps) {
  const { entries, removeEntry, refresh } = useGlossary()
  const dialogRef = useDialogFocusTrap(isOpen, onClose)

  // إعادة القراءة من localStorage عند كل فتح: هذا المكوّن مُركَّب طوال
  // عمر التطبيق (AppShell يعرضه دوماً، بصرف النظر عن isOpen)، وبطاقات
  // تعريف الكلمات المضيفة للمفردات تستخدم نسخة مستقلة تماماً من هذا
  // الخطّاف (انظر توثيق UseGlossaryResult.refresh) — بلا هذا التحديث
  // الصريح، كانت اللوحة ستعرض دوماً حالتها الأولى الفارغة عند الإقلاع
  useEffect(() => {
    if (isOpen) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

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
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            role="dialog"
            aria-modal="true"
            aria-label="المفردات الشخصية"
            tabIndex={-1}
            className="fixed inset-y-0 end-0 z-50 w-full max-w-sm p-3 outline-none"
          >
            <Card className="flex h-full flex-col gap-4 overflow-y-auto p-5 shadow-elevated">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
                  <BookMarked size={18} className="text-console" aria-hidden="true" />
                  المفردات الشخصية
                </h2>
                <IconButton aria-label="إغلاق لوحة المفردات" onClick={onClose}>
                  <X size={19} aria-hidden="true" />
                </IconButton>
              </div>

              <Button
                variant="secondary"
                size="sm"
                disabled={entries.length === 0}
                onClick={() => downloadTextFile(glossaryToCsv(entries), exportFileName())}
              >
                <Download size={14} aria-hidden="true" />
                تصدير المفردات (CSV)
              </Button>

              {entries.length === 0 ? (
                <p className="text-sm text-text-muted">
                  لا توجد كلمات محفوظة بعد. انقر أي كلمة في نص الترجمة أثناء المشاهدة، ثم اضغط
                  «أضف إلى المفردات» في بطاقة تعريفها لتظهر هنا.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-text-primary" dir="auto">
                          {entry.word}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          aria-label={`حذف "${entry.word}" من المفردات`}
                          className="shrink-0 rounded-sm text-text-muted transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                      {entry.partOfSpeech && (
                        <span className="w-fit rounded-sm bg-console/10 px-1.5 py-0.5 font-mono text-[10px] text-console">
                          {entry.partOfSpeech}
                        </span>
                      )}
                      {entry.translation && (
                        <p className="font-semibold text-console" dir="auto">
                          {entry.translation}
                        </p>
                      )}
                      {entry.definition && (
                        <p className="text-text-secondary" dir="auto">
                          {entry.definition}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
