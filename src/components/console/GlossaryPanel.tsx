import { useEffect, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, BookMarked, Trash2, Download, GraduationCap, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { useGlossary } from '@/hooks/useGlossary'
import { useCurrentVideoKey } from '@/context/VideoKeyContext'
import { GlossaryReview } from './GlossaryReview'
import { getDueEntries } from '@/lib/utils/spacedRepetition'
import { getValidContext } from '@/lib/utils/glossaryContext'
import { glossaryToCsv } from '@/lib/utils/glossaryExport'
import { glossaryToAnki } from '@/lib/utils/glossaryAnkiExport'
import { DAILY_REVIEW_GOAL, getReviewCountsByDay } from '@/lib/utils/reviewStatsStore'
import { toDayKey } from '@/lib/utils/learningStatsStore'
import { downloadTextFile } from '@/lib/subtitles/serializeSRT'

interface GlossaryPanelProps {
  isOpen: boolean
  onClose: () => void
  /** Moves the video to a time; used to jump back to the scene a word came from */
  onSeekToTime?: (seconds: number) => void
}

function ankiFileName(): string {
  return `anki_${new Date().toISOString().slice(0, 10)}.txt`
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
export function GlossaryPanel({ isOpen, onClose, onSeekToTime }: GlossaryPanelProps) {
  const { entries, removeEntry, gradeEntry, refresh } = useGlossary()
  const currentVideoKey = useCurrentVideoKey()
  const [isReviewing, setIsReviewing] = useState(false)
  const dueCount = getDueEntries(entries, Date.now()).length
  // Re-read on every render: grading a word re-renders the panel, which is when this changes
  const reviewsToday = getReviewCountsByDay().get(toDayKey(new Date())) ?? 0
  const dialogRef = useDialogFocusTrap(isOpen, onClose)

  // إعادة القراءة من localStorage عند كل فتح: هذا المكوّن مُركَّب طوال
  // عمر التطبيق (AppShell يعرضه دوماً، بصرف النظر عن isOpen)، وبطاقات
  // تعريف الكلمات المضيفة للمفردات تستخدم نسخة مستقلة تماماً من هذا
  // الخطّاف (انظر توثيق UseGlossaryResult.refresh) — بلا هذا التحديث
  // الصريح، كانت اللوحة ستعرض دوماً حالتها الأولى الفارغة عند الإقلاع
  useEffect(() => {
    if (isOpen) refresh()
    else setIsReviewing(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
            aria-hidden="true"
          />
          <m.div
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

              {isReviewing ? (
                <GlossaryReview
                  entries={entries}
                  currentVideoKey={currentVideoKey}
                  onGrade={gradeEntry}
                  onSeekToTime={
                    onSeekToTime
                      ? (seconds) => {
                          onSeekToTime(seconds)
                          onClose()
                        }
                      : undefined
                  }
                  onExit={() => setIsReviewing(false)}
                />
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Button disabled={dueCount === 0} onClick={() => setIsReviewing(true)}>
                      <GraduationCap size={15} aria-hidden="true" />
                      {dueCount > 0 ? `مراجعة الكلمات المستحقة (${dueCount})` : 'لا توجد كلمات مستحقة للمراجعة'}
                    </Button>
                    <p className="text-center text-xs text-text-muted" data-testid="reviews-today">
                      مراجعات اليوم:{' '}
                      {/* Numbers around " / " swap places inside Arabic text unless forced left-to-right */}
                      <span dir="ltr">
                        {reviewsToday} / {DAILY_REVIEW_GOAL}
                      </span>
                      {reviewsToday >= DAILY_REVIEW_GOAL && ' ✓'}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={entries.length === 0}
                      onClick={() => downloadTextFile(glossaryToCsv(entries), exportFileName())}
                    >
                      <Download size={14} aria-hidden="true" />
                      تصدير المفردات (CSV)
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={entries.length === 0}
                      onClick={() => downloadTextFile(glossaryToAnki(entries), ankiFileName())}
                    >
                      <Download size={14} aria-hidden="true" />
                      تصدير بطاقات Anki (بجُمل)
                    </Button>
                  </div>

                  {entries.length === 0 ? (
                    <p className="text-sm text-text-muted">
                      لا توجد كلمات محفوظة بعد. انقر أي كلمة في نص الترجمة أثناء المشاهدة، ثم اضغط
                      «أضف إلى المفردات» في بطاقة تعريفها لتظهر هنا.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {entries.map((entry) => {
                        const context = getValidContext(entry)
                        const canJump = context !== null && context.videoKey === currentVideoKey && onSeekToTime
                        return (
                          <li
                            key={entry.id}
                            className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-text-primary" dir="auto">
                                {entry.word}
                              </span>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {canJump && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSeekToTime(context.time)
                                      onClose()
                                    }}
                                    aria-label={`الانتقال إلى مشهد "${entry.word}" في الفيديو`}
                                    className="rounded-sm text-text-muted transition-colors hover:text-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
                                  >
                                    <MapPin size={14} aria-hidden="true" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeEntry(entry.id)}
                                  aria-label={`حذف "${entry.word}" من المفردات`}
                                  className="rounded-sm text-text-muted transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
                                >
                                  <Trash2 size={14} aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                            {entry.partOfSpeech && (
                              <span className="w-fit rounded-sm bg-console/10 px-1.5 py-0.5 font-mono text-[10px] text-console">
                                {entry.partOfSpeech}
                              </span>
                            )}
                            {(entry.article || (entry.lemma && entry.lemma.toLowerCase() !== entry.word.toLowerCase())) && (
                              <p className="text-xs text-text-secondary" dir="ltr" lang={entry.languageCode}>
                                <span className="font-medium text-text-primary">
                                  {[entry.article, entry.lemma ?? entry.word].filter(Boolean).join(' ')}
                                </span>
                                {entry.plural && ` · Pl. ${entry.plural}`}
                              </p>
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
                            {context && (
                              <p className="text-xs italic text-text-muted" dir="auto">
                                «{context.sentence}»
                              </p>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </>
              )}
            </Card>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
