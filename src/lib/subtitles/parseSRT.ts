import type { SubtitleCue } from '@/types/subtitle.types'

/**
 * تحليل محتوى ملف بصيغة SRT وتحويله إلى مصفوفة من SubtitleCue
 *
 * صيغة SRT النموذجية لكل مقطع:
 *   1
 *   00:00:01,000 --> 00:00:04,500
 *   نص الترجمة هنا
 *   (قد يمتد لعدة أسطر)
 *
 * نستخدم تعبيراً نمطياً (regex) واحداً للأسطر الزمنية مع دعم كل من الفاصلة
 * "," (المعيار الأصلي لـ SRT) والنقطة "." (شائعة في ملفات مُصدَّرة من أدوات
 * أخرى) لزيادة التوافق مع الملفات الحقيقية القادمة من مصادر متنوعة.
 */

const TIME_LINE_PATTERN =
  /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/

/** تحويل مكوّنات الوقت (ساعات/دقائق/ثواني/أجزاء الثانية) إلى ثوانٍ عشرية */
function timeComponentsToSeconds(
  hours: string,
  minutes: string,
  seconds: string,
  fraction: string,
): number {
  // توحيد جزء الثانية إلى 3 خانات (مللي ثانية) بغض النظر عن طول النص الأصلي
  const milliseconds = Number(fraction.padEnd(3, '0').slice(0, 3))
  return (
    Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + milliseconds / 1000
  )
}

/** إزالة وسوم HTML البسيطة الشائعة في ملفات SRT (مثل <i>، <b>) مع الإبقاء على النص */
function stripFormattingTags(text: string): string {
  return text.replace(/<\/?[^>]+>/g, '')
}

export function parseSRT(content: string): SubtitleCue[] {
  // توحيد فواصل الأسطر (بعض الملفات تأتي بترميز Windows CRLF)
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // تقسيم الملف إلى كتل منفصلة بسطر فارغ (كل كتلة = مقطع ترجمة واحد)
  const blocks = normalized.split(/\n\s*\n/).filter((block) => block.trim().length > 0)

  const cues: SubtitleCue[] = []

  for (const block of blocks) {
    const lines = block.split('\n')
    const timeLineIndex = lines.findIndex((line) => TIME_LINE_PATTERN.test(line))
    if (timeLineIndex === -1) continue // كتلة لا تحتوي سطراً زمنياً صالحاً — تُتجاهل

    const match = lines[timeLineIndex]!.match(TIME_LINE_PATTERN)
    if (!match) continue

    const [, h1, m1, s1, ms1, h2, m2, s2, ms2] = match as unknown as [
      string, string, string, string, string, string, string, string, string,
    ]

    const start = timeComponentsToSeconds(h1, m1, s1, ms1)
    const end = timeComponentsToSeconds(h2, m2, s2, ms2)

    // بقية أسطر الكتلة بعد السطر الزمني هي نص الترجمة
    const text = stripFormattingTags(lines.slice(timeLineIndex + 1).join('\n')).trim()

    if (text && end > start) {
      cues.push({ start, end, text })
    }
  }

  // ترتيب تصاعدي حسب زمن البداية لضمان عمل خوارزمية البحث الثنائي في المزامنة
  return cues.sort((a, b) => a.start - b.start)
}
