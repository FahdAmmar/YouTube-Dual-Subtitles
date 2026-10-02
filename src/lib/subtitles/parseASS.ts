import type { SubtitleCue } from '@/types/subtitle.types'

/**
 * تحليل ملفات Advanced SubStation Alpha (.ass) وSubStation Alpha (.ssa) إلى SubtitleCue
 *
 * أهم الفروق عن SRT/VTT: الأعمدة تُعرَّف بسطر "Format:" داخل قسم [Events]، والنص هو
 * العمود الأخير وقد يحتوي فواصل، والتوقيت بصيغة H:MM:SS.cc (أجزاء المئة من الثانية)،
 * وداخل النص وسوم تنسيق {\an8} وفواصل أسطر \N. الملف مُدخَل غير موثوق، لذا يعتمد
 * التحليل على مسح خطي بسيط بلا تعابير منتظمة على النص الحر (لا خطر ReDoS)
 */

interface EventLayout {
  start: number
  end: number
  text: number
  columnCount: number
}

// ترتيب ASS القياسي؛ ملفات SSA القديمة تضع Marked بدل Layer في الموضع نفسه
const DEFAULT_LAYOUT: EventLayout = { start: 1, end: 2, text: 9, columnCount: 10 }

const TIME_PATTERN = /^(\d+):(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?$/
const OVERRIDE_PAGE_MODE = /\\p(\d+)/g
const LINE_ESCAPES: Record<string, string> = { N: '\n', n: ' ', h: ' ' }

function parseTime(raw: string): number | null {
  const match = TIME_PATTERN.exec(raw.trim())
  if (!match) return null
  const [, hours, minutes, seconds, fraction] = match
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(`0.${fraction ?? '0'}`)
}

function parseLayout(formatValue: string): EventLayout {
  const columns = formatValue.split(',').map((column) => column.trim().toLowerCase())
  const start = columns.indexOf('start')
  const end = columns.indexOf('end')
  const text = columns.indexOf('text')
  if (start === -1 || end === -1 || text === -1) return DEFAULT_LAYOUT
  return { start, end, text, columnCount: columns.length }
}

/** Splits into at most `count` fields, so commas inside the last field (the text) survive */
function splitFields(value: string, count: number): string[] {
  const fields: string[] = []
  let position = 0
  while (fields.length < count - 1) {
    const comma = value.indexOf(',', position)
    if (comma === -1) break
    fields.push(value.slice(position, comma))
    position = comma + 1
  }
  fields.push(value.slice(position))
  return fields
}

/**
 * Drops {override} blocks, resolves \N \n \h, and skips vector drawings (\p1 and up),
 * which fansub files use for typesetting and are not subtitle text
 */
function cleanText(raw: string): string {
  let result = ''
  let isDrawing = false
  let position = 0

  while (position < raw.length) {
    if (raw[position] === '{') {
      const close = raw.indexOf('}', position + 1)
      if (close === -1) {
        // An unclosed brace is literal text, not the start of a tag
        if (!isDrawing) result += raw.slice(position)
        break
      }
      for (const match of raw.slice(position + 1, close).matchAll(OVERRIDE_PAGE_MODE)) {
        isDrawing = Number(match[1]) > 0
      }
      position = close + 1
      continue
    }

    const nextBrace = raw.indexOf('{', position)
    const end = nextBrace === -1 ? raw.length : nextBrace
    if (!isDrawing) result += raw.slice(position, end)
    position = end
  }

  return result.replace(/\\([Nnh])/g, (_, code: string) => LINE_ESCAPES[code] ?? '').trim()
}

export function parseASS(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = []
  let isInEvents = false
  let layout = DEFAULT_LAYOUT

  for (const rawLine of content.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('[')) {
      isInEvents = line.slice(1, line.indexOf(']')).trim().toLowerCase() === 'events'
      continue
    }
    if (!isInEvents) continue

    if (/^format:/i.test(line)) {
      layout = parseLayout(line.slice('format:'.length))
      continue
    }
    if (!/^dialogue:/i.test(line)) continue // Comment lines and anything else are not subtitles

    const fields = splitFields(line.slice('dialogue:'.length), layout.columnCount)
    const start = parseTime(fields[layout.start] ?? '')
    const end = parseTime(fields[layout.end] ?? '')
    const text = cleanText(fields[layout.text] ?? '')

    if (start !== null && end !== null && end > start && text) {
      cues.push({ start, end, text })
    }
  }

  return cues.sort((a, b) => a.start - b.start)
}
