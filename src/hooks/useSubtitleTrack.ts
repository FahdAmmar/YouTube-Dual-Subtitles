import { useCallback, useState } from 'react'
import { parseSubtitleFile, SubtitleParseError } from '@/lib/subtitles/parseSubtitleFile'
import { detectLanguageFromCues } from '@/lib/subtitles/detectLanguage'
import { getLanguageByCode } from '@/constants/languages'
import { readTrackLanguages, saveTrackLanguage } from '@/lib/utils/trackLanguageStore'
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
 *
 * اختيار اللغة: يبقى المسار في وضع "الكشف التلقائي" ما لم يختار المستخدم
 * لغةً صراحةً من القائمة (selectLanguage). طالما لم يُحدَّد اختيار صريح،
 * يُطبَّق الكشف من نص الملف المرفوع كما سابقاً؛ أما الاختيار الصريح فهو
 * الأعلى أولوية: يبقى حتى بعد رفع ملفات جديدة، ويتجاوز نتيجة الكشف مهما
 * كانت أدلتها. وnull يعني الرجوع إلى وضع الكشف التلقائي.
 */
export function useSubtitleTrack(
  initialLanguageCode: string,
  initialLanguageLabel: string,
  trackId?: 'source' | 'translation',
) {
  // الاختيار الصريح المحفوظ يُقرأ مرة واحدة عند إنشاء الـ Hook فقط؛ يظل
  // التغيير اللاحق ضمن الجلسة عبر حالة React، ويُكتب في التخزين المحلي
  // في نفس اللحظة ليجده السياق المقبلي كما تركه المستخدم
  const initialExplicit = trackId ? readTrackLanguages()[trackId] : null
  const [explicitLanguageCode, setExplicitLanguageCode] = useState<string | null>(initialExplicit)
  const [track, setTrack] = useState<SubtitleTrackState>(() => {
    // الاختيار الصريح المحفوظ يظهر فوراً في المسار الجديد (وليس فقط بعد
    // أول ملف) — فكي يعرض كل ما يتبع اللغة (العلامات، الأصوات، البحث)
    // الاختيار نفسه من لحظة فتح التطبيق
    const explicit = initialExplicit ? getLanguageByCode(initialExplicit) : undefined
    return explicit ? createEmptyState(explicit.code, explicit.labelAr) : createEmptyState(initialLanguageCode, initialLanguageLabel)
  })

  /**
   * لغة الملف المُرشد (Cues) بعد نجاح التحليل: الاختيار الصريح للمستخدم
   * يتفوق على الكشف التلقائي دائماً؛ وفي وضع الكشف التلقائي تُتبع نتيجة
   * الكشف، وقد تكون غير حاسمة (null) فتُبقى اللغة الحالية كما هي
   */
  const nextLanguageFields = useCallback(
    (previous: SubtitleTrackState, cues: SubtitleCue[]): Pick<SubtitleTrackState, 'languageCode' | 'languageLabel'> => {
      if (explicitLanguageCode) {
        const language = getLanguageByCode(explicitLanguageCode)
        if (language) return { languageCode: language.code, languageLabel: language.labelAr }
      }
      return detectedLanguageFields(cues) ?? previous
    },
    [explicitLanguageCode],
  )

  /**
   * يُرجع true عند نجاح التحليل وfalse عند الفشل — ضروري للطبقات الأعلى
   * (مثل حفظ محتوى الملف في IndexedDB لسجل المشاهدات) لمعرفة النتيجة
   * الفعلية دون الاعتماد على قراءة track بعد await (سيبقى نسخة قديمة من
   * لحظة إنشاء الدالة المستدعية، لا يعكس التحديث الذي حدث للتو داخل هذا الـ Hook)
   */
  const uploadFile = useCallback(
    async (file: File): Promise<boolean> => {
      setTrack((previous) => ({ ...previous, status: 'parsing', errorMessage: null }))

      try {
        const cues = await parseSubtitleFile(file)
        setTrack((previous) => ({
          ...previous,
          ...nextLanguageFields(previous, cues),
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
    },
    [nextLanguageFields],
  )

  /**
   * اختيار لغة المسار صراحةً من القائمة، أو null للرجوع إلى الكشف التلقائي.
   * يُحدَّث العرض فوراً، ويُحفظ الاختيار في التخزين المحلي حتى تبقى لغة
   * كل مسار كما اختارها المستخدم في زيارته التالية
   */
  const selectLanguage = useCallback(
    (code: string | null) => {
      setExplicitLanguageCode(code)
      setTrack((previous) => {
        const language = code ? getLanguageByCode(code) : undefined
        if (language) return { ...previous, languageCode: language.code, languageLabel: language.labelAr }
        // رجوع من اختيار صريح إلى وضع الكشف التلقائي: يُعاد الكشف من
        // المقاطع الحالية إن وُجدت، وإلا تُستأنف اللغة الابتدائية للمسار؛
        // ولا شيء يتغيّر إن كان يطابق المعروض أصلاً (تجنّب إعادة رسم زائدة)
        const detected = previous.cues.length > 0 ? detectedLanguageFields(previous.cues) : null
        const fallback = getLanguageByCode(initialLanguageCode)
        const target = detected ?? (fallback ? { languageCode: fallback.code, languageLabel: fallback.labelAr } : null)
        if (!target) return previous
        return target.languageCode === previous.languageCode ? previous : { ...previous, ...target }
      })
      if (trackId) saveTrackLanguage(trackId, code)
    },
    [initialLanguageCode, trackId],
  )

  /**
   * تعيين المقاطع مباشرةً دون المرور بتحليل ملف — يُستخدم لحالة الرفع
   * الثنائي: حيث يُحلَّل ملف واحد مرّةً واحدة ثم يُقسَّم إلى مسارين، فيُستدعى
   * هذا التابع على كلٍّ من المسارين بمحتواه المُقسَّم بدل قراءة الملف مرّتين.
   * يتصرف تماماً كرفع ملف ناجح (تصفير الإزاحة، تسجيل اسم الملف، حالة ready)
   */
  const loadCues = useCallback(
    (cues: SubtitleCue[], fileName: string) => {
      setTrack((previous) => ({
        ...previous,
        ...nextLanguageFields(previous, cues),
        fileName,
        cues,
        status: 'ready',
        errorMessage: null,
        syncOffsetSeconds: 0,
      }))
    },
    [nextLanguageFields],
  )

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

  return { track, uploadFile, loadCues, selectLanguage, explicitLanguageCode, setSyncOffset, nudgeSyncOffset, resetSyncOffset, reset }
}
