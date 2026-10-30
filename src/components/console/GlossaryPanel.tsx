import { useEffect, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { X, BookMarked, Download, GraduationCap, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { IconButton } from '@/components/ui/IconButton'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { useGlossary } from '@/hooks/useGlossary'
import { getValidContext } from '@/lib/utils/glossaryContext'
import { useCurrentVideoKey } from '@/context/VideoKeyContext'
import { GlossaryReview } from './GlossaryReview'
import { GlossaryEntryCard } from './GlossaryEntryCard'
import { GlossaryFilterBar } from './GlossaryFilterBar'
import { getReviewQueue } from '@/lib/utils/spacedRepetition'
import { DEFAULT_GLOSSARY_FILTERS, filterGlossaryEntries, type GlossaryFilters } from '@/lib/utils/glossaryFilter'
import { DEFAULT_NEW_LIMIT, NEW_LIMIT_OPTIONS, normalizeNewLimit } from '@/lib/utils/reviewLimit'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import type { GlossaryEntry } from '@/types/glossary.types'
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

/** How long the "undo" offer stays after a word is removed */
const UNDO_WINDOW_MS = 8000

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
  const { entries, removeEntry, restoreEntry, setNote, gradeEntry, refresh } = useGlossary()
  const currentVideoKey = useCurrentVideoKey()
  const [isReviewing, setIsReviewing] = useState(false)
  const [filters, setFilters] = useState<GlossaryFilters>(DEFAULT_GLOSSARY_FILTERS)
  const [removedEntry, setRemovedEntry] = useState<GlossaryEntry | null>(null)
  const [storedNewLimit, setStoredNewLimit] = useLocalStorage<number | null>(STORAGE_KEYS.REVIEW_NEW_LIMIT, DEFAULT_NEW_LIMIT)
  const newCardLimit = normalizeNewLimit(storedNewLimit)
  const dueCount = getReviewQueue(entries, Date.now(), newCardLimit).length
  const visibleEntries = filterGlossaryEntries(entries, {
    query: filters.query,
    status: filters.status,
    sort: filters.sort,
    videoKey: filters.onlyThisVideo ? currentVideoKey : null,
    now: Date.now(),
  })
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
    else {
      setIsReviewing(false)
      setRemovedEntry(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // The undo offer is short-lived: after that a removal is final
  useEffect(() => {
    if (!removedEntry) return
    const timer = setTimeout(() => setRemovedEntry(null), UNDO_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [removedEntry])

  function handleRemove(entry: GlossaryEntry) {
    removeEntry(entry.id)
    setRemovedEntry(entry)
  }

  function handleUndo() {
    if (!removedEntry) return
    restoreEntry(removedEntry)
    setRemovedEntry(null)
  }

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
            className="fixed inset-y-0 inset-e-0 z-50 w-full max-w-sm p-3 outline-hidden"
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
                  newCardLimit={newCardLimit}
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
                    {entries.length > 0 && (
                      <Select
                        id="review-new-limit"
                        label="كلمات جديدة في كل جلسة مراجعة"
                        value={newCardLimit === null ? 'all' : String(newCardLimit)}
                        onChange={(event) => setStoredNewLimit(normalizeNewLimit(event.target.value === 'all' ? null : Number(event.target.value)))}
                        className="text-sm"
                      >
                        {NEW_LIMIT_OPTIONS.map((option) => (
                          <option key={option ?? 'all'} value={option === null ? 'all' : String(option)}>
                            {option === null ? 'بلا حد' : option}
                          </option>
                        ))}
                      </Select>
                    )}
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
                    <>
                      <GlossaryFilterBar
                        filters={filters}
                        onChange={setFilters}
                        canFilterByVideo={currentVideoKey !== null}
                        visibleCount={visibleEntries.length}
                        totalCount={entries.length}
                      />
                      {visibleEntries.length === 0 ? (
                        <div className="flex flex-col items-start gap-2 text-sm text-text-muted">
                          <p>لا توجد كلمات مطابقة</p>
                          <Button variant="secondary" size="sm" onClick={() => setFilters(DEFAULT_GLOSSARY_FILTERS)}>
                            مسح البحث
                          </Button>
                        </div>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {visibleEntries.map((entry) => {
                            const context = getValidContext(entry)
                            const canJump = context !== null && context.videoKey === currentVideoKey && onSeekToTime
                            return (
                              <GlossaryEntryCard
                                key={entry.id}
                                entry={entry}
                                onJump={
                                  canJump
                                    ? (seconds) => {
                                        onSeekToTime(seconds)
                                        onClose()
                                      }
                                    : undefined
                                }
                                onRemove={handleRemove}
                                onSaveNote={setNote}
                              />
                            )
                          })}
                        </ul>
                      )}
                    </>
                  )}
                </>
              )}

              <div role="status" aria-live="polite" className="sticky bottom-0 mt-auto">
                {removedEntry && (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm shadow-elevated">
                    <span className="min-w-0 truncate text-text-secondary">
                      تم حذف «<bdi className="font-semibold text-text-primary">{removedEntry.word}</bdi>»
                    </span>
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="flex shrink-0 items-center gap-1 rounded-sm font-medium text-console hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console"
                    >
                      <Undo2 size={14} aria-hidden="true" />
                      تراجع
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
