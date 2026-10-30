import { useEffect, useRef } from 'react'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import { getVideoKey } from '@/lib/utils/videoKey'
import type { VideoSource } from '@/types/video.types'

type OffsetMap = Record<string, number>

function readOffsetMap(): OffsetMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.SYNC_OFFSETS)
    return raw ? (JSON.parse(raw) as OffsetMap) : {}
  } catch {
    return {}
  }
}

function writeOffsetMap(map: OffsetMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.SYNC_OFFSETS, JSON.stringify(map))
  } catch {
    // تجاهل أخطاء الكتابة (مثال: امتلاء الحصة المخصصة)، بنفس نمط useLocalStorage
  }
}

/**
 * يحذف كل إزاحات التزامن المحفوظة لفيديو واحد (المسار المصدر والترجمة
 * معاً — قد يصل لمُدخلين لكل فيديو) — يُستدعى عند إزالة مُدخل من سجل
 * المشاهدات (useWatchHistory). المفتاح مركّب (videoKey::trackId::fileName)
 * وليس videoKey وحده، فالحذف هنا بالبادئة لا بمطابقة تامة
 */
export function deleteOffsetsForVideo(videoKey: string): void {
  const map = readOffsetMap()
  const prefix = `${videoKey}::`
  let didDelete = false
  for (const key of Object.keys(map)) {
    if (key.startsWith(prefix)) {
      delete map[key]
      didDelete = true
    }
  }
  if (didDelete) writeOffsetMap(map)
}

/**
 * يحفظ إزاحة تزامن الترجمة (syncOffsetSeconds) لكل تركيبة (فيديو + مسار +
 * ملف ترجمة) على حدة، ويستعيدها تلقائياً عند رفع نفس الملف لنفس الفيديو
 * مرة أخرى — بنفس فلسفة useVideoProgress: تصحيح التزامن يدوياً مرة واحدة
 * كافٍ، بدل تكراره في كل زيارة لنفس ملف الترجمة غير الدقيق التوقيت.
 *
 * المفتاح مركّب من ثلاثة أجزاء وليس الفيديو وحده:
 * - trackId ('source'/'translation'): الرفع الثنائي اللغة (ملف واحد يُقسَّم
 *   لمسارين) يُنتج نفس اسم الملف للمسارين معاً، فبدون هذا الجزء يتشارك
 *   المساران نفس مفتاح التخزين خطأً ويُصبح أحدهما يستعيد إزاحة الآخر
 * - fileName: ملفان مختلفان لنفس الفيديو غالباً بتوقيتين مختلفين تماماً؛
 *   ربط الإزاحة بالملف تحديداً يمنع تطبيق تصحيح خاطئ عند رفع ملف مختلف لاحقاً
 *   (يطابق سلوك تصفير الإزاحة تلقائياً عند رفع ملف جديد في useSubtitleTrack)
 */
export function useSyncOffsetPersistence(
  trackId: 'source' | 'translation',
  source: VideoSource | null,
  fileName: string | null,
  syncOffsetSeconds: number,
  setSyncOffset: (seconds: number) => void,
  loadCount: number,
): void {
  const offsetKey = source && fileName ? `${getVideoKey(source)}::${trackId}::${fileName}` : null
  // A load is identified by the key plus the load counter, not by the key alone: loading the same file again (the
  // automatic restore from IndexedDB, or the person uploading it once more) keeps the key but still resets the
  // offset to 0, and the saved offset has to be applied again
  const loadId = offsetKey ? `${offsetKey}#${loadCount}` : null
  const restoredLoadRef = useRef<string | null>(null)
  const settledLoadRef = useRef<string | null>(null)

  // الاستعادة: مرة واحدة لكل عملية تحميل (فيديو + مسار + ملف)
  useEffect(() => {
    if (!offsetKey || restoredLoadRef.current === loadId) return
    restoredLoadRef.current = loadId

    const saved = readOffsetMap()[offsetKey]
    if (saved) setSyncOffset(saved)
  }, [offsetKey, loadId, setSyncOffset])

  // الحفظ: عند كل تغيير فعلي للإزاحة (بفعل المستخدم عبر أزرار +/-)
  useEffect(() => {
    if (!offsetKey) return
    // The commit that first shows a new load still holds the 0 the load reset the offset to; saving that would
    // erase the stored value before the restore above has applied it. Skip exactly that one run per load
    if (settledLoadRef.current !== loadId) {
      settledLoadRef.current = loadId
      return
    }

    const map = readOffsetMap()
    if (syncOffsetSeconds === 0) {
      // لا داعٍ لتخزين إزاحة صفرية — تبسيط وتوفير مساحة
      if (!(offsetKey in map)) return
      delete map[offsetKey]
    } else {
      map[offsetKey] = syncOffsetSeconds
    }
    writeOffsetMap(map)
  }, [offsetKey, loadId, syncOffsetSeconds])
}
