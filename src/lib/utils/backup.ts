import { STORAGE_KEYS } from '@/constants/theme.constants'
import { MAX_FILE_SIZE_BYTES } from '@/lib/subtitles/parseSubtitleFile'
import {
  getAllSubtitleFiles,
  restoreSubtitleFiles,
  MAX_STORED_FILES,
  type StoredSubtitleFile,
} from './subtitleContentStore'

export const BACKUP_FORMAT = 'ydc-backup'
export const BACKUP_VERSION = 1
/** 30 subtitle files at the 2 MB cap plus settings, with headroom */
export const MAX_BACKUP_BYTES = 64 * 1024 * 1024

const MAX_KEY_LENGTH = 1000
const ALLOWED_LOCAL_KEYS: ReadonlySet<string> = new Set(Object.values(STORAGE_KEYS))

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  createdAt: number
  /** Raw localStorage strings, restored as-is (readers already tolerate bad data) */
  local: Record<string, string>
  subtitles: StoredSubtitleFile[]
}

/** Message is user-facing Arabic text */
export class BackupError extends Error {}

export async function createBackup(): Promise<BackupFile> {
  const local: Record<string, string> = {}
  for (const key of ALLOWED_LOCAL_KEYS) {
    const value = window.localStorage.getItem(key)
    if (value !== null) local[key] = value
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: Date.now(),
    local,
    subtitles: await getAllSubtitleFiles(),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseSubtitleEntry(entry: unknown): StoredSubtitleFile {
  if (
    !isRecord(entry) ||
    typeof entry.key !== 'string' ||
    entry.key.length === 0 ||
    entry.key.length > MAX_KEY_LENGTH ||
    typeof entry.content !== 'string' ||
    entry.content.length > MAX_FILE_SIZE_BYTES ||
    typeof entry.savedAt !== 'number' ||
    !Number.isFinite(entry.savedAt)
  ) {
    throw new BackupError('الملف يحتوي على ترجمة محفوظة غير صالحة')
  }
  return { key: entry.key, content: entry.content, savedAt: entry.savedAt }
}

/** Validates everything before anything is written: the file is untrusted input */
export function parseBackup(text: string): BackupFile {
  if (text.length > MAX_BACKUP_BYTES) throw new BackupError('الملف أكبر من الحد المسموح')

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError('الملف ليس بصيغة JSON صحيحة')
  }

  if (!isRecord(data) || data.format !== BACKUP_FORMAT) {
    throw new BackupError('هذا ليس ملف نسخة احتياطية لهذا التطبيق')
  }
  if (data.version !== BACKUP_VERSION) {
    throw new BackupError('إصدار النسخة الاحتياطية غير مدعوم')
  }
  if (!isRecord(data.local) || !Array.isArray(data.subtitles) || typeof data.createdAt !== 'number') {
    throw new BackupError('بنية النسخة الاحتياطية غير صالحة')
  }
  if (data.subtitles.length > MAX_STORED_FILES) {
    throw new BackupError('عدد الترجمات في الملف يتجاوز الحد المسموح')
  }

  // Only allow-listed keys are copied; anything else (including "__proto__") is dropped
  const local: Record<string, string> = {}
  for (const [key, value] of Object.entries(data.local)) {
    if (!ALLOWED_LOCAL_KEYS.has(key)) continue
    if (typeof value !== 'string') throw new BackupError('الملف يحتوي على قيمة إعداد غير صالحة')
    local[key] = value
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: data.createdAt,
    local,
    subtitles: data.subtitles.map(parseSubtitleEntry),
  }
}

function writeLocalWithRollback(local: Record<string, string>): void {
  const previous = new Map<string, string | null>()
  try {
    for (const [key, value] of Object.entries(local)) {
      previous.set(key, window.localStorage.getItem(key))
      window.localStorage.setItem(key, value)
    }
  } catch {
    for (const [key, value] of previous) {
      if (value === null) window.localStorage.removeItem(key)
      else window.localStorage.setItem(key, value)
    }
    throw new BackupError('تعذّرت الاستعادة: مساحة تخزين المتصفح ممتلئة')
  }
}

export async function applyBackup(backup: BackupFile): Promise<void> {
  writeLocalWithRollback(backup.local)
  try {
    await restoreSubtitleFiles(backup.subtitles)
  } catch {
    throw new BackupError('تمت استعادة الإعدادات لكن تعذّر حفظ ملفات الترجمة')
  }
}
