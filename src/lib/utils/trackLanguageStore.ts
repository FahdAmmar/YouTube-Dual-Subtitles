import { STORAGE_KEYS } from '@/constants/theme.constants'
import { getLanguageByCode } from '@/constants/languages'

/** لكل مسار ترجمة اختيار لغة صريح اختياري — null يعني "كشف تلقائي" */
export interface TrackLanguageSelection {
  source: string | null
  translation: string | null
}

const EMPTY_SELECTION: TrackLanguageSelection = { source: null, translation: null }

/** قيم غير معروفة (متصفح قديم، بيانات تالفة) تُهمل بدل تعطيل التطبيق */
function sanitize(raw: unknown): TrackLanguageSelection {
  if (!raw || typeof raw !== 'object') return EMPTY_SELECTION
  const record = raw as Partial<Record<keyof TrackLanguageSelection, unknown>>
  const read = (value: unknown): string | null => {
    if (typeof value !== 'string' || !value) return null
    return getLanguageByCode(value) ? value : null
  }
  return { source: read(record.source), translation: read(record.translation) }
}

export function readTrackLanguages(): TrackLanguageSelection {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.TRACK_LANGUAGES)
    return raw ? sanitize(JSON.parse(raw)) : EMPTY_SELECTION
  } catch {
    return EMPTY_SELECTION
  }
}

/** يحفظ الاختيار الصريح لمسار واحد، أو يمسحه (null = رجوع للكشف التلقائي) */
export function saveTrackLanguage(trackId: keyof TrackLanguageSelection, code: string | null): void {
  const next = { ...readTrackLanguages(), [trackId]: code }
  try {
    window.localStorage.setItem(STORAGE_KEYS.TRACK_LANGUAGES, JSON.stringify(next))
  } catch {
    // تجاهل أخطاء الكتابة (امتلاء الحصة، وضع التصفح الخاص) بنمط بقية المخازن
  }
}
