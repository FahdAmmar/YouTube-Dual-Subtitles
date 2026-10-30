import { useState } from 'react'
import {
  getGlossaryEntries,
  saveGlossaryEntry,
  deleteGlossaryEntry,
  makeGlossaryEntryId,
  updateGlossaryNote,
} from '@/lib/utils/glossaryStore'
import { applyGrade } from '@/lib/utils/spacedRepetition'
import { addReview } from '@/lib/utils/reviewStatsStore'
import type { GlossaryEntry, ReviewGrade } from '@/types/glossary.types'

export interface UseGlossaryResult {
  entries: GlossaryEntry[]
  /** يحفظ كلمة جديدة، أو يستبدل مُدخلاً سابقاً لنفس الكلمة/اللغة إن وُجد (بلا تكرار) */
  addEntry: (entry: Omit<GlossaryEntry, 'id' | 'addedAt'>) => void
  removeEntry: (id: string) => void
  /** Puts a removed word back exactly as it was (id, date added and review progress included) — the undo of removeEntry */
  restoreEntry: (entry: GlossaryEntry) => void
  /** Sets the learner's note on a saved word; blank text clears it */
  setNote: (id: string, note: string) => void
  /** Records a review answer and schedules the word's next review */
  gradeEntry: (id: string, grade: ReviewGrade) => void
  /** هل هذه الكلمة محفوظة أصلاً؟ يُستخدم لتبديل حالة زر "أضف/أُضيفت" في بطاقة التعريف */
  hasEntry: (word: string, languageCode: string) => boolean
  /**
   * يُعيد قراءة القائمة من localStorage فوراً — ضروري لأن كل استدعاء لهذا
   * الخطّاف يحتفظ بنسخته المحلية الخاصة من الحالة (بنفس نمط
   * useWatchHistoryEntries تماماً)، فمُدخل يُضاف من نسخة (مثال: بطاقة
   * تعريف كلمة في مقطع ما) لا ينعكس تلقائياً على نسخة أخرى (لوحة
   * المفردات) إلا بإعادة القراءة صراحةً — تُستدعى من GlossaryPanel عند
   * كل فتح للوحة تحديداً لهذا السبب
   */
  refresh: () => void
}

/** يعرض/يدير المفردات الشخصية — للاستخدام في لوحة المفردات وأزرار "أضف للمفردات" داخل بطاقات المقاطع */
export function useGlossary(): UseGlossaryResult {
  const [entries, setEntries] = useState<GlossaryEntry[]>(() => getGlossaryEntries())

  function addEntry(entry: Omit<GlossaryEntry, 'id' | 'addedAt'>) {
    const fullEntry: GlossaryEntry = {
      ...entry,
      id: makeGlossaryEntryId(entry.word, entry.languageCode),
      addedAt: Date.now(),
    }
    saveGlossaryEntry(fullEntry)
    setEntries(getGlossaryEntries())
  }

  function removeEntry(id: string) {
    deleteGlossaryEntry(id)
    setEntries(getGlossaryEntries())
  }

  function restoreEntry(entry: GlossaryEntry) {
    saveGlossaryEntry(entry)
    setEntries(getGlossaryEntries())
  }

  function setNote(id: string, note: string) {
    updateGlossaryNote(id, note)
    setEntries(getGlossaryEntries())
  }

  function gradeEntry(id: string, grade: ReviewGrade) {
    const entry = entries.find((candidate) => candidate.id === id)
    if (!entry) return
    saveGlossaryEntry(applyGrade(entry, grade, Date.now()))
    addReview()
    setEntries(getGlossaryEntries())
  }

  function hasEntry(word: string, languageCode: string): boolean {
    const id = makeGlossaryEntryId(word, languageCode)
    return entries.some((entry) => entry.id === id)
  }

  function refresh() {
    setEntries(getGlossaryEntries())
  }

  return { entries, addEntry, removeEntry, restoreEntry, setNote, gradeEntry, hasEntry, refresh }
}
