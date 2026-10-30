import { STORAGE_KEYS } from '@/constants/theme.constants'
import type { GlossaryEntry } from '@/types/glossary.types'

// سقف عدد المُدخلات المحفوظة — نفس فلسفة MAX_HISTORY_ENTRIES في
// useWatchHistory: نُبقي الأحدث دوماً، ونحذف الأقدم تلقائياً بصمت بدل
// نمو localStorage بلا حدود لمن يبني مفردات ضخمة بمرور الوقت
const MAX_GLOSSARY_ENTRIES = 300

export const MAX_NOTE_LENGTH = 500

/** Fired on window after every change, so views that hold their own copy of the list (word highlighting) can refresh */
export const GLOSSARY_CHANGED_EVENT = 'ydc:glossary-changed'

type GlossaryMap = Record<string, GlossaryEntry>

export function makeGlossaryEntryId(word: string, languageCode: string): string {
  return `${languageCode}::${word.trim().toLowerCase()}`
}

function readGlossaryMap(): GlossaryMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.GLOSSARY)
    return raw ? (JSON.parse(raw) as GlossaryMap) : {}
  } catch {
    return {}
  }
}

function writeGlossaryMap(map: GlossaryMap): void {
  const pruned: GlossaryMap = {}
  for (const entry of Object.values(map)
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, MAX_GLOSSARY_ENTRIES)) {
    pruned[entry.id] = entry
  }
  try {
    window.localStorage.setItem(STORAGE_KEYS.GLOSSARY, JSON.stringify(pruned))
    window.dispatchEvent(new Event(GLOSSARY_CHANGED_EVENT))
  } catch {
    // تجاهل أخطاء الكتابة (مثال: امتلاء الحصة المخصصة)، بنفس نمط useWatchHistory
  }
}

export function getGlossaryEntries(): GlossaryEntry[] {
  return Object.values(readGlossaryMap()).sort((a, b) => b.addedAt - a.addedAt)
}

export function saveGlossaryEntry(entry: GlossaryEntry): void {
  const map = readGlossaryMap()
  map[entry.id] = entry
  writeGlossaryMap(map)
}

export function deleteGlossaryEntry(id: string): void {
  const map = readGlossaryMap()
  delete map[id]
  writeGlossaryMap(map)
}

/** Sets or clears (blank text) the learner's note on a saved word. The note is free text: trimmed and length-capped. */
export function updateGlossaryNote(id: string, note: string): void {
  const map = readGlossaryMap()
  const entry = map[id]
  if (!entry) return
  const cleaned = note.trim().slice(0, MAX_NOTE_LENGTH)
  const updated: GlossaryEntry = { ...entry }
  if (cleaned) updated.note = cleaned
  else delete updated.note
  map[id] = updated
  writeGlossaryMap(map)
}
