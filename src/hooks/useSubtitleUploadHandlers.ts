import { useCallback, useState } from 'react'
import { parseSubtitleFile, SubtitleParseError } from '@/lib/subtitles/parseSubtitleFile'
import { splitBilingualCues } from '@/lib/subtitles/splitBilingualCues'
import { cuesToSrt } from '@/lib/subtitles/serializeSRT'
import { getVideoKey } from '@/lib/utils/videoKey'
import { saveSubtitleContent } from '@/lib/utils/subtitleContentStore'
import type { useSubtitleTrack } from './useSubtitleTrack'
import type { VideoSource } from '@/types/video.types'

type SubtitleTrackHook = ReturnType<typeof useSubtitleTrack>

type BilingualUploadStatus = 'idle' | 'parsing' | 'ready' | 'error'

export interface BilingualUploadState {
  status: BilingualUploadStatus
  fileName: string | null
  errorMessage: string | null
}

export interface UseSubtitleUploadHandlersResult {
  onUploadSource: (file: File) => Promise<void>
  onUploadTranslation: (file: File) => Promise<void>
  onUploadBilingual: (file: File) => Promise<void>
  bilingualUpload: BilingualUploadState
}

/**
 * يجمع كل مسارات رفع ملفات الترجمة الثلاثة (مصدر منفرد، ترجمة منفردة،
 * ثنائي اللغة) في مكان واحد متماسك — كلها تفعل جوهرياً نفس الشيء: تحليل
 * الملف عبر useSubtitleTrack، ثم حفظ محتواه كاملاً في IndexedDB بعد
 * النجاح فقط (يتيح التفعيل التلقائي لاحقاً عند العودة من سجل المشاهدات —
 * انظر useAutoRestoreSubtitles). استُخرج من AppShell لأنه معنيّ فقط
 * بـ(مصدر الفيديو + مساري الترجمة)، بلا أي علاقة بالشريط الجانبي أو
 * الإعدادات أو أي اهتمام آخر يُنسِّقه AppShell
 */
export function useSubtitleUploadHandlers(
  videoSource: VideoSource | null,
  sourceTrack: SubtitleTrackHook,
  translationTrack: SubtitleTrackHook,
): UseSubtitleUploadHandlersResult {
  // حالة رفع الملف الثنائي اللغة منفصلة عن حالة كل مسار: ملفاً واحداً
  // يُغذّي المسارين معاً، فنحتاج حالة مستقلة (parsing/error/ready) تُعرَض
  // في صف الرفع الثنائي دون التداخل مع حالة كل مسار على حدة
  const [bilingualUpload, setBilingualUpload] = useState<BilingualUploadState>({
    status: 'idle',
    fileName: null,
    errorMessage: null,
  })

  // غلاف فوق uploadFile: يحفظ محتوى الملف كاملاً في IndexedDB بعد نجاح
  // الرفع فقط (uploadFile يُرجع النتيجة الفعلية تحديداً لهذا الغرض)
  const onUploadSource = useCallback(
    async (file: File) => {
      const succeeded = await sourceTrack.uploadFile(file)
      if (succeeded && videoSource) {
        void file.text().then((content) => saveSubtitleContent(getVideoKey(videoSource), 'source', file.name, content))
      }
    },
    // sourceTrack.uploadFile مستقر (useCallback([]) داخل useSubtitleTrack)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceTrack.uploadFile, videoSource],
  )

  const onUploadTranslation = useCallback(
    async (file: File) => {
      const succeeded = await translationTrack.uploadFile(file)
      if (succeeded && videoSource) {
        void file
          .text()
          .then((content) => saveSubtitleContent(getVideoKey(videoSource), 'translation', file.name, content))
      }
    },
    // translationTrack.uploadFile مستقر (useCallback([]) داخل useSubtitleTrack)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translationTrack.uploadFile, videoSource],
  )

  // رفع ملف ثنائي اللغة: يُحلَّل مرة واحدة ثم يُقسَّم إلى مسارين بنفس
  // التوقيت، فيُحمَّل كلٌّ منهما مباشرةً عبر loadCues دون إعادة تحليل.
  // النتيجة: نفس تصميم لوحة النص والترجمة فوق الفيديو المعتاد، كأن المستخدم
  // رفع ملفّين منفصلين تماماً
  const { loadCues: loadSourceCues } = sourceTrack
  const { loadCues: loadTranslationCues } = translationTrack
  const onUploadBilingual = useCallback(
    async (file: File) => {
      setBilingualUpload({ status: 'parsing', fileName: null, errorMessage: null })
      try {
        const cues = await parseSubtitleFile(file)
        const { sourceCues, translationCues } = splitBilingualCues(cues)
        if (sourceCues.length === 0 && translationCues.length === 0) {
          throw new SubtitleParseError('لم يُعثَر على نص ترجمة صالح داخل الملف')
        }
        loadSourceCues(sourceCues, file.name)
        loadTranslationCues(translationCues, file.name)
        setBilingualUpload({ status: 'ready', fileName: file.name, errorMessage: null })

        // حفظ محتوى كل مسار منفصلاً (بصيغة SRT مُعاد بناؤها عبر cuesToSrt)
        // — الملف الأصلي واحد لكليهما، لكن المحتوى المُستعاد يجب أن يطابق
        // ما يراه المستخدم فعلياً في كل مسار على حدة
        if (videoSource) {
          const videoKey = getVideoKey(videoSource)
          if (sourceCues.length > 0) void saveSubtitleContent(videoKey, 'source', file.name, cuesToSrt(sourceCues))
          if (translationCues.length > 0) {
            void saveSubtitleContent(videoKey, 'translation', file.name, cuesToSrt(translationCues))
          }
        }
      } catch (error) {
        const message =
          error instanceof SubtitleParseError ? error.message : 'حدث خطأ غير متوقع أثناء قراءة الملف'
        setBilingualUpload({ status: 'error', fileName: null, errorMessage: message })
      }
    },
    [loadSourceCues, loadTranslationCues, videoSource],
  )

  return { onUploadSource, onUploadTranslation, onUploadBilingual, bilingualUpload }
}
