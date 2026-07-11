import type { SubtitleCue } from '@/types/subtitle.types'
import { findActiveCue } from './findActiveCue'

/** مقطع موحّد يجمع نص المسارين معاً عند نفس النافذة الزمنية، لعرضه في قائمة النص */
export interface PairedSlice {
  id: string
  start: number
  end: number
  sourceText: string | null
  translationText: string | null
}

/**
 * دمج مساري ترجمة مستقلين (قد يختلفان في عدد المقاطع وتوقيتها تماماً)
 * في قائمة "مقاطع" موحّدة صالحة للعرض في لوحة النص الجانبية
 *
 * الإستراتيجية: يُستخدم المسار الذي يملك مقاطع كخط زمني أساسي (Backbone)،
 * وعند كل مقطع منه نبحث عن نص المسار الآخر النشط في نفس تلك اللحظة عبر
 * findActiveCue (نفس خوارزمية البحث الثنائي المستخدمة أصلاً للمزامنة
 * الحية). هذا لا يفترض تطابقاً 1:1 بين الملفين — وهو افتراض غير واقعي عند
 * رفع ملفين مستقلين من مصدرين مختلفين — بل يبني "أفضل مطابقة زمنية ممكنة"
 * لكل مقطع من الخط الزمني الأساسي.
 *
 * إن امتلك المساران مقاطع، يُفضَّل المسار الأول (source) كخط أساسي بما أنه
 * عادة اللغة الأصلية للفيديو؛ إن كان فارغاً يُستخدم المسار الثاني بدلاً
 * منه حتى تبقى لوحة النص مفيدة بملف واحد فقط أثناء انتظار رفع الثاني.
 *
 * إصلاح دقة المزامنة (مهم لخاصية الإبراز/highlight): يُعرَّف "الوقت
 * الحقيقي" الذي يظهر فيه مقطع الخط الأساسي فوق الفيديو بأنه
 * cue.start/end بعد إضافة إزاحته اليدوية — تماماً كما تحسبه SubtitleOverlay
 * (التي تطرح الإزاحة من الوقت الحالي قبل البحث). سابقاً كانت start/end في
 * الشريحة الموحّدة تُبنى من توقيت الخط الأساسي الخام دون إضافة إزاحته،
 * بينما التراكب فوق الفيديو كان يحسب توقيته الفعلي مع الإزاحة — ما يعني
 * أن تمييز "المقطع النشط حالياً" في لوحة النص كان ينزلق زمنياً عن الترجمة
 * الظاهرة فعلياً فوق الفيديو بمقدار الإزاحة كلما استخدم المستخدم أزرار
 * ضبط التزامن. تخزين التوقيت بعد الإزاحة هنا يضمن تطابق لحظة الإبراز في
 * اللوحة الجانبية مع لحظة ظهور نفس الترجمة فوق الفيديو تماماً، بدقة تصل
 * لأجزاء الثانية
 */
export function pairCuesIntoSlices(
  sourceCues: SubtitleCue[],
  translationCues: SubtitleCue[],
  sourceOffsetSeconds: number,
  translationOffsetSeconds: number,
): PairedSlice[] {
  const backboneIsSource = sourceCues.length > 0
  const backbone = backboneIsSource ? sourceCues : translationCues
  // إزاحة الخط الأساسي نفسه — تُضاف لاحقاً إلى start/end ليعكسا التوقيت
  // الحقيقي الظاهر فعلياً على الفيديو بعد أي تصحيح يدوي للتزامن
  const backboneOffsetSeconds = backboneIsSource ? sourceOffsetSeconds : translationOffsetSeconds

  return backbone.map((cue, index) => {
    // نقطة منتصف المقطع (بتوقيته الخام) أدق من نقطة البداية للبحث في
    // المسار الآخر، خصوصاً حين يختلف تقطيع الجملتين قليلاً بين الملفين
    const midpoint = (cue.start + cue.end) / 2

    // التوقيت الحقيقي المعروض فعلياً للمقطع بعد تطبيق إزاحته اليدوية
    const realStart = cue.start + backboneOffsetSeconds
    const realEnd = cue.end + backboneOffsetSeconds

    if (backboneIsSource) {
      const matchedTranslation = findActiveCue(
        translationCues,
        midpoint - (translationOffsetSeconds - sourceOffsetSeconds),
      )
      return {
        id: `slice-${index}`,
        start: realStart,
        end: realEnd,
        sourceText: cue.text,
        translationText: matchedTranslation?.text ?? null,
      }
    }

    const matchedSource = findActiveCue(
      sourceCues,
      midpoint - (sourceOffsetSeconds - translationOffsetSeconds),
    )
    return {
      id: `slice-${index}`,
      start: realStart,
      end: realEnd,
      sourceText: matchedSource?.text ?? null,
      translationText: cue.text,
    }
  })
}
