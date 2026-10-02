import { useCallback, useState } from 'react'
import { parseSubtitleFile, SubtitleParseError } from '@/lib/subtitles/parseSubtitleFile'
import { detectLanguageFromCues } from '@/lib/subtitles/detectLanguage'
import { getLanguageByCode } from '@/constants/languages'
import type { SubtitleCue, SubtitleTrackState } from '@/types/subtitle.types'

/** الحد الأقصى/الأدنى المسموح به للإزاحة اليدوية — نطاق معقول يغطي كل الحالات الواقعية */
export const MAX_SYNC_OFFSET_SECONDS = 15
const SYNC_OFFSET_STEP_SECONDS = 0.25

function createEmptyState(languageCode: string, languageLabel: string): SubtitleTrackState {
  return {
    languageLabel,
    languageCode,
    fileName: null,
    cues: [],
    status: 'empty',
    errorMessage: null,
    syncOffsetSeconds: 0,
  }
}

/** Language fields to apply for these cues; empty when detection is inconclusive (keep current) */
function detectedLanguageFields(cues: SubtitleCue[]): Pick<SubtitleTrackState, 'languageCode' | 'languageLabel'> | null {
  const code = detectLanguageFromCues(cues)
  const language = code ? getLanguageByCode(code) : undefined
  return language ? { languageCode: language.code, languageLabel: language.labelAr } : null
}

function clampOffset(value: number): number {
  return Math.min(MAX_SYNC_OFFSET_SECONDS, Math.max(-MAX_SYNC_OFFSET_SECONDS, value))
}

/**
 * Hook يدير دورة حياة مسار ترجمة واحد بالكامل: من رفع الملف، مروراً بحالة
 * التحليل، وصولاً للنجاح أو الفشل، بالإضافة لإدارة الإزاحة الزمنية اليدوية
 * الخاصة بهذا المسار. عزل هذا المنطق في Hook مستقل (بدل تكراره لكل مسار
 * داخل المكوّن الأب) يحقق مبدأ DRY، حيث يُستدعى مرتين فقط (لكل مسار)
 * بنفس السلوك المضمون.
 */
export function useSubtitleTrack(initialLanguageCode: string, initialLanguageLabel: string) {
  const [track, setTrack] = useState<SubtitleTrackState>(() =>
    createEmptyState(initialLanguageCode, initialLanguageLabel),
  )

  /**
   * يُرجع true عند نجاح التحليل وfalse عند الفشل — ضروري للطبقات الأعلى
   * (مثل حفظ محتوى الملف في IndexedDB لسجل المشاهدات) لمعرفة النتيجة
   * الفعلية دون الاعتماد على قراءة track بعد await (سيبقى نسخة قديمة من
   * لحظة إنشاء الدالة المستدعية، لا يعكس التحديث الذي حدث للتو داخل هذا الـ Hook)
   */
  const uploadFile = useCallback(async (file: File): Promise<boolean> => {
    setTrack((previous) => ({ ...previous, status: 'parsing', errorMessage: null }))

    try {
      const cues = await parseSubtitleFile(file)
      const detected = detectedLanguageFields(cues)
      setTrack((previous) => ({
        ...previous,
        ...detected,
        fileName: file.name,
        cues,
        status: 'ready',
        errorMessage: null,
        // تصفير الإزاحة تلقائياً عند رفع ملف جديد: إزاحة الملف السابق
        // غير ذات صلة بملف مختلف تماماً، والاحتفاظ بها سيربك المستخدم
        syncOffsetSeconds: 0,
      }))
      return true
    } catch (error) {
      const message =
        error instanceof SubtitleParseError
          ? error.message
          : 'حدث خطأ غير متوقع أثناء قراءة الملف'
      setTrack((previous) => ({
        ...previous,
        cues: [],
        fileName: null,
        status: 'error',
        errorMessage: message,
      }))
      return false
    }
  }, [])

  const setLanguage = useCallback((languageCode: string, languageLabel: string) => {
    setTrack((previous) => ({ ...previous, languageCode, languageLabel }))
  }, [])

  /**
   * تعيين المقاطع مباشرةً دون المرور بتحليل ملف — يُستخدم لحالة الرفع
   * الثنائي: حيث يُحلَّل ملف واحد مرّةً واحدة ثم يُقسَّم إلى مسارين، فيُستدعى
   * هذا التابع على كلٍّ من المسارين بمحتواه المُقسَّم بدل قراءة الملف مرّتين.
   * يتصرف تماماً كرفع ملف ناجح (تصفير الإزاحة، تسجيل اسم الملف، حالة ready)
   */
  const loadCues = useCallback((cues: SubtitleCue[], fileName: string) => {
    const detected = detectedLanguageFields(cues)
    setTrack((previous) => ({
      ...previous,
      ...detected,
      fileName,
      cues,
      status: 'ready',
      errorMessage: null,
      syncOffsetSeconds: 0,
    }))
  }, [])

  /** ضبط الإزاحة الزمنية مباشرة على قيمة محددة (تُستخدم من شريط التمرير) */
  const setSyncOffset = useCallback((seconds: number) => {
    setTrack((previous) => ({ ...previous, syncOffsetSeconds: clampOffset(seconds) }))
  }, [])

  /** تعديل الإزاحة بمقدار خطوة ثابتة (تُستخدم من زري +/- السريعين) */
  const nudgeSyncOffset = useCallback((direction: 1 | -1) => {
    setTrack((previous) => ({
      ...previous,
      syncOffsetSeconds: clampOffset(previous.syncOffsetSeconds + direction * SYNC_OFFSET_STEP_SECONDS),
    }))
  }, [])

  const resetSyncOffset = useCallback(() => {
    setTrack((previous) => ({ ...previous, syncOffsetSeconds: 0 }))
  }, [])

  const reset = useCallback(() => {
    setTrack((previous) => createEmptyState(previous.languageCode, previous.languageLabel))
  }, [])

  return { track, uploadFile, loadCues, setLanguage, setSyncOffset, nudgeSyncOffset, resetSyncOffset, reset }
}
