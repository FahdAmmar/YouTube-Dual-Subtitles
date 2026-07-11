import { useCallback, useState } from 'react'
import { parseSubtitleFile, SubtitleParseError } from '@/lib/subtitles/parseSubtitleFile'
import type { SubtitleTrackState } from '@/types/subtitle.types'

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

  const uploadFile = useCallback(async (file: File) => {
    setTrack((previous) => ({ ...previous, status: 'parsing', errorMessage: null }))

    try {
      const cues = await parseSubtitleFile(file)
      setTrack((previous) => ({
        ...previous,
        fileName: file.name,
        cues,
        status: 'ready',
        errorMessage: null,
        // تصفير الإزاحة تلقائياً عند رفع ملف جديد: إزاحة الملف السابق
        // غير ذات صلة بملف مختلف تماماً، والاحتفاظ بها سيربك المستخدم
        syncOffsetSeconds: 0,
      }))
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
    }
  }, [])

  const setLanguage = useCallback((languageCode: string, languageLabel: string) => {
    setTrack((previous) => ({ ...previous, languageCode, languageLabel }))
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

  return { track, uploadFile, setLanguage, setSyncOffset, nudgeSyncOffset, resetSyncOffset, reset }
}
