import { useEffect, useRef } from 'react'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import { getVideoKey } from '@/lib/utils/videoKey'
import type { VideoSource } from '@/types/video.types'
import type { UseVideoPlayerResult } from './useVideoPlayer'

const SAVE_INTERVAL_MS = 4000
/** لا فائدة من استئناف فيديو بالكاد بدأ — يبدو وكأنه لم يستأنف شيئاً فعلياً */
const MIN_RESUMABLE_SECONDS = 5
/** لا نُعيد المستخدم قرب النهاية تماماً لو كان قد أنهى الفيديو فعلياً في زيارة سابقة */
const END_GUARD_SECONDS = 12
/** سقف عدد الفيديوهات المحفوظة معاً — يمنع نمو localStorage بلا حدود مع تراكم فيديوهات كثيرة بمرور الوقت */
const MAX_STORED_ENTRIES = 40

interface ProgressEntry {
  time: number
  duration: number
  savedAt: number
}

type ProgressMap = Record<string, ProgressEntry>

function readProgressMap(): ProgressMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.VIDEO_PROGRESS)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

function writeProgressMap(map: ProgressMap): void {
  try {
    // تقليم أقدم الإدخالات (حسب وقت آخر حفظ) لو تجاوز العدد الحد الأقصى
    const entries = Object.entries(map)
    const trimmedEntries =
      entries.length > MAX_STORED_ENTRIES
        ? entries.sort((a, b) => a[1].savedAt - b[1].savedAt).slice(entries.length - MAX_STORED_ENTRIES)
        : entries
    window.localStorage.setItem(STORAGE_KEYS.VIDEO_PROGRESS, JSON.stringify(Object.fromEntries(trimmedEntries)))
  } catch {
    // تجاهل أخطاء الكتابة (مثال: امتلاء الحصة المخصصة)، بنفس نمط useLocalStorage
  }
}

/**
 * يحذف موضع التقدّم المحفوظ لفيديو واحد — يُستدعى عند إزالة مُدخل من سجل
 * المشاهدات (useWatchHistory) كي لا يبقى تقدّماً يتيماً لفيديو لم يعد
 * مذكوراً في السجل أصلاً
 */
export function deleteProgressForVideo(videoKey: string): void {
  const map = readProgressMap()
  if (!(videoKey in map)) return
  delete map[videoKey]
  writeProgressMap(map)
}

/**
 * يحفظ موضع التشغيل الحالي دورياً لكل فيديو على حدة، ويستأنف منه تلقائياً
 * في المرة التالية التي يُفتح فيها نفس الفيديو (بنفس الرابط أو نفس اسم
 * الملف) — بلا أي تأكيد أو واجهة إضافية، تماماً كسلوك معظم مشغّلات الفيديو
 *
 * قرار هندسي: player كائن جديد بمرجع مختلف في كل إعادة رسم (نفس الملاحظة
 * الموجودة في useVideoPlayer وuseSceneRepeat)، فتخزينه هنا في ref بدل
 * الاعتماد عليه مباشرة كتبعية (dependency) يمنع إعادة إنشاء المؤقّت
 * الدوري وتفكيكه في كل إعادة رسم لأي سبب آخر تماماً بالكامل
 */
export function useVideoProgress(source: VideoSource | null, player: UseVideoPlayerResult): void {
  const playerRef = useRef(player)
  playerRef.current = player

  const progressKey = source ? getVideoKey(source) : null
  const hasRestoredRef = useRef<string | null>(null)

  // الاستعادة: بمجرد جاهزية المشغّل لفيديو جديد، اقفز مرة واحدة فقط للموضع
  // المحفوظ (إن وُجد ومنطقياً) — الحارس hasRestoredRef يمنع تكرار القفز
  // لنفس الفيديو عند كل إعادة رسم لاحقة طالما لم يتغيّر الفيديو نفسه
  useEffect(() => {
    if (!progressKey || !player.isReady) return
    if (hasRestoredRef.current === progressKey) return
    hasRestoredRef.current = progressKey

    const entry = readProgressMap()[progressKey]
    if (!entry || entry.time <= MIN_RESUMABLE_SECONDS) return

    const nearEnd = player.duration > 0 && entry.time > player.duration - END_GUARD_SECONDS
    if (!nearEnd) playerRef.current.seekTo(entry.time)
  }, [progressKey, player.isReady, player.duration])

  // الحفظ الدوري: كل بضع ثوانٍ طالما هناك فيديو محمَّل، بغض النظر عن حالة
  // التشغيل (إيقاف مؤقت يستحق حفظاً أيضاً — المستخدم قد يغلق التبويب وهو متوقف)
  useEffect(() => {
    if (!progressKey) return

    const intervalId = setInterval(() => {
      const currentPlayer = playerRef.current
      const currentTime = currentPlayer.getCurrentTime()
      if (currentTime < MIN_RESUMABLE_SECONDS) return

      const map = readProgressMap()
      map[progressKey] = { time: currentTime, duration: currentPlayer.duration, savedAt: Date.now() }
      writeProgressMap(map)
    }, SAVE_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [progressKey])
}
