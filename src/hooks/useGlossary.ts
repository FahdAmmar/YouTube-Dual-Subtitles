import { useState } from 'react'
import {
  getGlossaryEntries,
  saveGlossaryEntry,
  deleteGlossaryEntry,
  makeGlossaryEntryId,
} from '@/lib/utils/glossaryStore'
import type { GlossaryEntry } from '@/types/glossary.types'

export interface UseGlossaryResult {
  entries: GlossaryEntry[]
  /** يحفظ كلمة جديدة، أو يستبدل مُدخلاً سابقاً لنفس الكلمة/اللغة إن وُجد (بلا تكرار) */
  addEntry: (entry: Omit<GlossaryEntry, 'id' | 'addedAt'>) => void
  removeEntry: (id: string) => void
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

  function hasEntry(word: string, languageCode: string): boolean {
    const id = makeGlossaryEntryId(word, languageCode)
    return entries.some((entry) => entry.id === id)
  }

  function refresh() {
    setEntries(getGlossaryEntries())
  }

  return { entries, addEntry, removeEntry, hasEntry, refresh }
}
