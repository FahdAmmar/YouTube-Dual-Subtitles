import type { SubtitleCue } from '@/types/subtitle.types'

/**
 * تحليل محتوى ملف بصيغة WebVTT (.vtt) وتحويله إلى مصفوفة من SubtitleCue
 *
 * الفرق الجوهري عن SRT: يستخدم النقطة "." بدل الفاصلة "," للفصل بين الثواني
 * وأجزائها، ويبدأ الملف عادة بترويسة "WEBVTT"، وقد تحتوي أسطر التوقيت على
 * إعدادات إضافية بعدها (مثل position:10%,line:20%) يجب تجاهلها بأمان.
 */

const TIME_LINE_PATTERN =
  /(\d{1,2}):(\d{2}):(\d{2})\.(\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})\.(\d{1,3})/

// بعض ملفات VTT تستخدم صيغة "دقائق:ثواني" فقط بدون خانة الساعات
const TIME_LINE_PATTERN_SHORT =
  /(\d{2}):(\d{2})\.(\d{1,3})\s*-->\s*(\d{2}):(\d{2})\.(\d{1,3})/

function timeComponentsToSeconds(
  hours: string,
  minutes: string,
  seconds: string,
  fraction: string,
): number {
  const milliseconds = Number(fraction.padEnd(3, '0').slice(0, 3))
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + milliseconds / 1000
}

function stripFormattingTags(text: string): string {
  return text.replace(/<\/?[^>]+>/g, '')
}

export function parseVTT(content: string): SubtitleCue[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const blocks = normalized.split(/\n\s*\n/).filter((block) => block.trim().length > 0)

  const cues: SubtitleCue[] = []

  for (const block of blocks) {
    const lines = block.split('\n')

    const timeLineIndex = lines.findIndex(
      (line) => TIME_LINE_PATTERN.test(line) || TIME_LINE_PATTERN_SHORT.test(line),
    )
    if (timeLineIndex === -1) continue // تجاهل ترويسة WEBVTT وكتل NOTE/STYLE

    const line = lines[timeLineIndex]!
    let start: number
    let end: number

    const fullMatch = line.match(TIME_LINE_PATTERN)
    if (fullMatch) {
      const [, h1, m1, s1, ms1, h2, m2, s2, ms2] = fullMatch as unknown as [
        string, string, string, string, string, string, string, string, string,
      ]
      start = timeComponentsToSeconds(h1, m1, s1, ms1)
      end = timeComponentsToSeconds(h2, m2, s2, ms2)
    } else {
      const shortMatch = line.match(TIME_LINE_PATTERN_SHORT)
      if (!shortMatch) continue
      const [, m1, s1, ms1, m2, s2, ms2] = shortMatch as unknown as [
        string, string, string, string, string, string, string,
      ]
      start = timeComponentsToSeconds('0', m1, s1, ms1)
      end = timeComponentsToSeconds('0', m2, s2, ms2)
    }

    const text = stripFormattingTags(lines.slice(timeLineIndex + 1).join('\n')).trim()

    if (text && end > start) {
      cues.push({ start, end, text })
    }
  }

  return cues.sort((a, b) => a.start - b.start)
}
