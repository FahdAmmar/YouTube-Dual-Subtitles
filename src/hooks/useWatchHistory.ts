import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import { getVideoKey } from '@/lib/utils/videoKey'
import { getSubtitleContent, deleteSubtitleContentForVideo, type SubtitleTrackId } from '@/lib/utils/subtitleContentStore'
import { deleteProgressForVideo } from './useVideoProgress'
import { deleteOffsetsForVideo } from './useSyncOffsetPersistence'
import type { VideoSource } from '@/types/video.types'
import type { HistorySourceRef, WatchHistoryEntry } from '@/types/history.types'

// سقف عدد المُدخلات المحفوظة — يمنع نمو localStorage بلا حدود لمن يشاهد
// مئات الفيديوهات المختلفة بمرور الوقت (نفس القيمة والفلسفة المعتمدة في
// useVideoProgress: نُبقي الأحدث دوماً، ونحذف الأقدم تلقائياً بصمت)
const MAX_HISTORY_ENTRIES = 40

type HistoryMap = Record<string, WatchHistoryEntry>

function readHistoryMap(): HistoryMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY)
    return raw ? (JSON.parse(raw) as HistoryMap) : {}
  } catch {
    return {}
  }
}

function writeHistoryMap(map: HistoryMap): void {
  const pruned: HistoryMap = {}
  for (const entry of Object.values(map)
    .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt)
    .slice(0, MAX_HISTORY_ENTRIES)) {
    pruned[entry.videoKey] = entry
  }
  try {
    window.localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(pruned))
  } catch {
    // تجاهل أخطاء الكتابة (مثال: امتلاء الحصة المخصصة)، بنفس نمط useLocalStorage
  }
}

function sourceToHistoryRef(source: VideoSource): HistorySourceRef {
  return source.type === 'youtube' ? { type: 'youtube', videoId: source.videoId } : { type: 'local', fileName: source.fileName }
}

/** قراءة مُدخل واحد بالمفتاح — تُستخدم لعرض تذكير ملفات الترجمة بمجرد تحميل فيديو له سجل سابق */
export function getHistoryEntryByKey(videoKey: string): WatchHistoryEntry | null {
  return readHistoryMap()[videoKey] ?? null
}

/**
 * يسجّل/يحدّث مُدخل سجل المشاهدات للفيديو الحالي — يُستدعى من AppShell طوال
 * مدة تشغيل أي فيديو، ويُحدَّث تلقائياً كلما توفّر عنوان يوتيوب أو تغيّر اسم
 * ملف ترجمة (رفع/تبديل). لا يفعل شيئاً قبل وجود مصدر فيديو فعلي.
 *
 * ملاحظة تصميم مهمة: عدم توفّر اسم ملف ترجمة في هذه اللحظة (null) لا يعني
 * حذف الاسم المحفوظ سابقاً — فقط تحديثه عند توفّر اسم جديد فعلاً. وإلا
 * لكانت أول زيارة لفيديو محفوظ (حيث لم تُرفع الترجمة بعد هذه الجلسة) تمحو
 * التذكير الذي بُنيت هذه الميزة أصلاً لأجله
 */
export function useRecordWatchHistory(
  source: VideoSource | null,
  videoTitle: string | null,
  sourceFileName: string | null,
  translationFileName: string | null,
): void {
  useEffect(() => {
    if (!source) return

    const videoKey = getVideoKey(source)
    const map = readHistoryMap()
    const previous = map[videoKey]

    const displayName = source.type === 'youtube' ? videoTitle || previous?.displayName || 'فيديو يوتيوب' : source.fileName
    const thumbnailUrl = source.type === 'youtube' ? `https://img.youtube.com/vi/${source.videoId}/mqdefault.jpg` : undefined

    map[videoKey] = {
      videoKey,
      source: sourceToHistoryRef(source),
      displayName,
      thumbnailUrl,
      lastWatchedAt: Date.now(),
      subtitleFileNames: {
        source: sourceFileName ?? previous?.subtitleFileNames.source,
        translation: translationFileName ?? previous?.subtitleFileNames.translation,
      },
    }
    writeHistoryMap(map)
  }, [source, videoTitle, sourceFileName, translationFileName])
}

/** يعرض/يدير قائمة سجل المشاهدات — للاستخدام في شاشة اختيار الفيديو فقط */
export function useWatchHistoryEntries(): {
  entries: WatchHistoryEntry[]
  removeEntry: (videoKey: string) => void
  clearHistory: () => void
} {
  const [entries, setEntries] = useState<WatchHistoryEntry[]>(() =>
    Object.values(readHistoryMap()).sort((a, b) => b.lastWatchedAt - a.lastWatchedAt),
  )

  // "إزالة" مُدخل يجب أن تعني إزالته فعلياً بكل ما يرتبط به — لا فقط
  // اختفاءه من القائمة المرئية بينما يبقى تقدّمه وإزاحته ومحتوى ترجمته
  // يتيماً في مخازن أخرى منفصلة (useVideoProgress، useSyncOffsetPersistence،
  // subtitleContentStore) لا يراها المستخدم أبداً ولا سبيل له لتنظيفها يدوياً
  function cleanupAssociatedData(videoKey: string): void {
    deleteProgressForVideo(videoKey)
    deleteOffsetsForVideo(videoKey)
    void deleteSubtitleContentForVideo(videoKey)
  }

  function removeEntry(videoKey: string) {
    const map = readHistoryMap()
    delete map[videoKey]
    writeHistoryMap(map)
    setEntries(Object.values(map).sort((a, b) => b.lastWatchedAt - a.lastWatchedAt))
    cleanupAssociatedData(videoKey)
  }

  function clearHistory() {
    for (const entry of Object.values(readHistoryMap())) {
      cleanupAssociatedData(entry.videoKey)
    }
    writeHistoryMap({})
    setEntries([])
  }

  return { entries, removeEntry, clearHistory }
}

/**
 * يستعيد محتوى ملفات الترجمة تلقائياً من IndexedDB (إن كان محفوظاً فعلاً
 * من رفع سابق) عند تحميل فيديو له سجل مشاهدات سابق — بلا أي نقرة إضافية
 * من المستخدم. إن لم يكن المحتوى محفوظاً (متصفح لا يدعم IndexedDB، أو
 * الملف رُفع قبل إضافة هذه الميزة)، لا يفعل شيئاً بصمت — يبقى تذكير
 * SourceFileRow النصي (اسم الملف فقط) كخطة بديلة واضحة للمستخدم.
 *
 * التبعيات الكاملة (بما فيها اسم الملف الحالي لكل مسار) آمنة تماماً هنا:
 * فور نجاح الاستعادة يصبح اسم الملف الحالي معروفاً، فيعيد هذا الأثر
 * التشغيل تلقائياً لكن دالة restore الداخلية تتجاهل الاستعادة فوراً طالما
 * يوجد اسم ملف حالي بالفعل (currentFileName) — لا حلقة تكرار ولا استعادة مزدوجة
 */
export function useAutoRestoreSubtitles(
  videoSource: VideoSource | null,
  historyEntry: WatchHistoryEntry | null,
  sourceFileName: string | null,
  translationFileName: string | null,
  uploadSourceFile: (file: File) => Promise<boolean>,
  uploadTranslationFile: (file: File) => Promise<boolean>,
): void {
  useEffect(() => {
    if (!videoSource || !historyEntry) return
    const videoKey = getVideoKey(videoSource)

    async function restore(
      trackId: SubtitleTrackId,
      rememberedFileName: string | undefined,
      currentFileName: string | null,
      uploadFile: (file: File) => Promise<boolean>,
    ) {
      if (!rememberedFileName || currentFileName) return
      const content = await getSubtitleContent(videoKey, trackId, rememberedFileName)
      if (!content) return
      await uploadFile(new File([content], rememberedFileName))
    }

    void restore('source', historyEntry.subtitleFileNames.source, sourceFileName, uploadSourceFile)
    void restore('translation', historyEntry.subtitleFileNames.translation, translationFileName, uploadTranslationFile)
  }, [videoSource, historyEntry, sourceFileName, translationFileName, uploadSourceFile, uploadTranslationFile])
}
