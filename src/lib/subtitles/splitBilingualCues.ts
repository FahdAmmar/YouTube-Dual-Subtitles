import type { SubtitleCue } from '@/types/subtitle.types'

/**
 * نتيجة تقسيم مقطع ثنائي اللغة واحد إلى نصّيه (المصدر والترجمة) — قد يكون
 * أيٌّ منهما null إذا لم يُعثَر على نص بالاتجاه الموافق ضمن المقطع
 */
export interface SplitCueTextResult {
  sourceText: string | null
  translationText: string | null
}

/**
 * نطاقات يونيكود للحروف التي تُكتب من اليمين لليسار (RTL):
 * - العربية (\u0600-\u06FF)، السريانية (\u0700-\u074F)، العربية الموسّعة
 *   (\u0750-\u077F، \u08A0-\u08FF)
 * - العبرية (\u0590-\u05FF)
 * - أشكال العرض العربية (\uFB50-\uFDFF) والعبرية المقدّمة (\uFE70-\uFEFF)
 *
 * الاعتماد على اتجاه الرسم هو أنسب استراتيجية عامة لتمييز نصّي المصدر
 * والترجمة في ملف ثنائي اللغة دون افتراض ترتيب ثابت للأسطر — يطابق توجه
 * التطبيق (المصدر = لغة RTL كالعربية، الترجمة = لغة LTR كالإنجليزية)
 */
const RTL_CHAR_PATTERN =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

function detectLineDirection(text: string): 'rtl' | 'ltr' {
  return RTL_CHAR_PATTERN.test(text) ? 'rtl' : 'ltr'
}

/**
 * تقسيم نص مقطع واحد (قد يحوي عدة أسطر) إلى نصّي المصدر والترجمة
 *
 * الإستراتيجية (مرتّبة من الأقوى للأضعف):
 * 1. تقسيم النص إلى أسطر، وتجميع الأسطر المتتالية ذات الاتجاه نفسه
 * 2. إن وُجدت مجموعات من كلا الاتجاهين → RTL يُعامَل كمصدر، LTR كترجمة
 *    (مطابق لافتراض التطبيق: العربية مصدر، الإنجليزية ترجمة)
 * 3. إن اتّحدت كل الأسطر بالاتجاه نفسه (زوج لغتين من نفس الاتجاه، أو
 *    ملف أحادي اللغة) → تراجع لاستراتيجية الموضع: السطر الأول مصدر،
 *    وبقية الأسطر ترجمة (مطابق لما يُصدِّره التطبيق نفسه عبر pairedSlicesToSrt)
 * 4. إن كان سطراً واحداً فقط → يُسنَد حسب اتجاهه (RTL مصدر، LTR ترجمة)؛
 *    والآخر يبقى null (المقطع ناقص لغة واحدة)
 */
export function splitCueText(text: string): SplitCueTextResult {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return { sourceText: null, translationText: null }
  }

  if (lines.length === 1) {
    const line = lines[0]!
    return detectLineDirection(line) === 'rtl'
      ? { sourceText: line, translationText: null }
      : { sourceText: null, translationText: line }
  }

  // تجميع الأسطر المتتالية ذات الاتجاه نفسه في مجموعات
  const groups: { dir: 'rtl' | 'ltr'; lines: string[] }[] = []
  for (const line of lines) {
    const dir = detectLineDirection(line)
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.dir === dir) {
      lastGroup.lines.push(line)
    } else {
      groups.push({ dir, lines: [line] })
    }
  }

  const rtlLines = groups.filter((g) => g.dir === 'rtl').flatMap((g) => g.lines)
  const ltrLines = groups.filter((g) => g.dir === 'ltr').flatMap((g) => g.lines)

  // إن وُجدت أسطر من كلا الاتجاهين: التجميع حسب الاتجاه هو الأنسب
  if (rtlLines.length > 0 && ltrLines.length > 0) {
    return {
      sourceText: rtlLines.join('\n'),
      translationText: ltrLines.join('\n'),
    }
  }

  // تراجع للموضع: السطر الأول مصدر، البقية ترجمة — يعمل لأزواج اللغات
  // من نفس الاتجاه (إنجليزي+فرنسي مثلاً) ويطابق صيغة التصدير الخاصة بنا
  return {
    sourceText: lines[0]!,
    translationText: lines.slice(1).join('\n'),
  }
}

export interface SplitBilingualCuesResult {
  sourceCues: SubtitleCue[]
  translationCues: SubtitleCue[]
}

/**
 * تقسيم ملف ترجمة ثنائي اللغة (كل مقطع يحوي نصّي اللغتين معاً، عادةً في
 * سطرين متتاليين) إلى مسارين مستقلّين بمحتوى منفصل لكن بنفس التوقيت
 *
 * الناتج يُمرَّر مباشرةً إلى loadCues على كلا المسارين (المصدر والترجمة)
 * فيظهر الملفان في لوحة النص المتزامن وفوق الفيديو بنفس تصميم التطبيق
 * المعتاد دون أي تغيير بصري — تماماً كأن المستخدم رفع ملفّين منفصلين.
 *
 * ملاحظة: إن كان الملف في الحقيقة أحادي اللغة (ليس ثنائياً)، يُسنَد كل
 * المحتوى إلى المسار الموافق لاتجاهه والآخر يبقى فارغاً — سلوك آمن لا
 * يُسقط التطبيق، ويُتيح للمستخدم ملاحظة الأمر واستخدام رفع المسار المنفصل
 */
export function splitBilingualCues(cues: SubtitleCue[]): SplitBilingualCuesResult {
  const sourceCues: SubtitleCue[] = []
  const translationCues: SubtitleCue[] = []

  for (const cue of cues) {
    const { sourceText, translationText } = splitCueText(cue.text)
    if (sourceText) {
      sourceCues.push({ start: cue.start, end: cue.end, text: sourceText })
    }
    if (translationText) {
      translationCues.push({ start: cue.start, end: cue.end, text: translationText })
    }
  }

  return { sourceCues, translationCues }
}
