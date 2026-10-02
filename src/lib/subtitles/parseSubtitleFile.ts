import type { SubtitleCue, SubtitleFormat } from '@/types/subtitle.types'
import { parseSRT } from './parseSRT'
import { parseVTT } from './parseVTT'
import { parseASS } from './parseASS'

/** حد أقصى لحجم ملف الترجمة المقبول (2 ميغابايت كافية جداً لأي فيديو طويل) */
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024

/** Single source of truth for the file pickers and the validation below */
export const SUPPORTED_SUBTITLE_EXTENSIONS = ['srt', 'vtt', 'ass', 'ssa'] as const
export const SUBTITLE_FILE_ACCEPT = SUPPORTED_SUBTITLE_EXTENSIONS.map((extension) => `.${extension}`).join(',')

export class SubtitleParseError extends Error {}

/** استكشاف صيغة الملف من امتداده أولاً، ومن محتواه كخطة بديلة */
function detectFormat(file: File, content: string): SubtitleFormat {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'vtt') return 'vtt'
  if (extension === 'srt') return 'srt'
  if (extension === 'ass' || extension === 'ssa') return 'ass'

  // خطة بديلة: ملفات WebVTT تبدأ دائماً بترويسة "WEBVTT"
  return content.trimStart().startsWith('WEBVTT') ? 'vtt' : 'srt'
}

/**
 * قراءة ملف ترجمة مرفوع من المستخدم وتحليله إلى مصفوفة مقاطع موحّدة
 *
 * تحقّقات أمنية قبل المعالجة (متطلب OWASP: التحقق من كل مُدخل):
 * 1. رفض الملفات الأكبر من الحد المسموح لمنع هجمات استنزاف الموارد (DoS)
 * 2. رفض الامتدادات غير المتوقعة قبل قراءة المحتوى
 * ملاحظة: لا حاجة لتعقيم (sanitize) المحتوى هنا لأن React يقوم تلقائياً
 * بتحويل النصوص إلى Text Nodes آمنة عند العرض عبر {} بدل dangerouslySetInnerHTML
 * (انظر مكوّن SubtitleLine للتفاصيل)
 */
export async function parseSubtitleFile(file: File): Promise<SubtitleCue[]> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new SubtitleParseError('حجم الملف كبير جداً (الحد الأقصى 2 ميغابايت)')
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !(SUPPORTED_SUBTITLE_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new SubtitleParseError('صيغة الملف غير مدعومة (المسموح: SRT أو VTT أو ASS أو SSA فقط)')
  }

  const content = await file.text()
  if (!content.trim()) {
    throw new SubtitleParseError('الملف فارغ')
  }

  const format = detectFormat(file, content)
  const cues = format === 'ass' ? parseASS(content) : format === 'vtt' ? parseVTT(content) : parseSRT(content)

  if (cues.length === 0) {
    throw new SubtitleParseError('لم يتم العثور على أي مقطع ترجمة صالح داخل الملف')
  }

  return cues
}
