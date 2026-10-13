import type { CueWord, SubtitleCue } from '@/types/subtitle.types'

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

/** Splits on <hh:mm:ss.mmm> tags, keeping the timestamps (odd positions) between the text pieces */
const INLINE_TIMESTAMP_SPLIT = /<((?:\d{1,2}:)?\d{2}:\d{2}\.\d{1,3})>/

function parseInlineTimestamp(value: string): number {
  const parts = value.split(':')
  const [seconds, fraction = '0'] = parts.pop()!.split('.')
  const minutes = Number(parts.pop() ?? 0)
  const hours = Number(parts.pop() ?? 0)
  return hours * 3600 + minutes * 60 + Number(seconds) + Number(fraction.padEnd(3, '0').slice(0, 3)) / 1000
}

/**
 * YouTube's automatic captions mark when each word starts with inline timestamps:
 * `Hello<00:00:00.500><c> world</c>`. Words that share one timestamp are spread over
 * the time up to the next timestamp, in proportion to their length. Lines without
 * any timestamp yield no words (the caller checks the result still matches the text).
 */
function extractWordTimings(payloadLines: string[], cueStart: number, cueEnd: number): CueWord[] {
  const words: CueWord[] = []

  for (const line of payloadLines) {
    const pieces = line.split(INLINE_TIMESTAMP_SPLIT)
    if (pieces.length < 3) continue

    const segments: { text: string; start: number }[] = []
    for (let index = 0; index < pieces.length; index += 2) {
      const start = index === 0 ? cueStart : parseInlineTimestamp(pieces[index - 1]!)
      segments.push({ text: stripFormattingTags(pieces[index]!), start })
    }

    segments.forEach((segment, index) => {
      const segmentWords = segment.text.split(/\s+/).filter(Boolean)
      if (segmentWords.length === 0) return
      const segmentEnd = segments[index + 1]?.start ?? cueEnd
      const totalLength = segmentWords.reduce((sum, word) => sum + word.length, 0)
      let lengthBefore = 0
      for (const word of segmentWords) {
        const share = totalLength > 0 ? lengthBefore / totalLength : 0
        words.push({ text: word, start: Math.round((segment.start + (segmentEnd - segment.start) * share) * 1000) / 1000 })
        lengthBefore += word.length
      }
    })
  }

  return words
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

    const payloadLines = lines.slice(timeLineIndex + 1)
    const text = stripFormattingTags(payloadLines.join('\n')).trim()

    if (text && end > start) {
      const words = extractWordTimings(payloadLines, start, end)
      cues.push(words.length > 0 ? { start, end, text, words } : { start, end, text })
    }
  }

  return cues.sort((a, b) => a.start - b.start)
}
