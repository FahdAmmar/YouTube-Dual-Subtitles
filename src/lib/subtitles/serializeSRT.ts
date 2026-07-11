import type { SubtitleCue } from '@/types/subtitle.types'

/** تحويل ثوانٍ عشرية إلى صيغة توقيت SRT القياسية: HH:MM:SS,mmm */
function secondsToSrtTimestamp(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds)
  const hours = Math.floor(clamped / 3600)
  const minutes = Math.floor((clamped % 3600) / 60)
  const seconds = Math.floor(clamped % 60)
  const milliseconds = Math.round((clamped - Math.floor(clamped)) * 1000)

  const pad = (value: number, length = 2) => value.toString().padStart(length, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`
}

/** تحويل مصفوفة مقاطع إلى نص ملف SRT كامل وصالح */
export function cuesToSrt(cues: SubtitleCue[]): string {
  return cues
    .map((cue, index) => {
      const sequenceNumber = index + 1
      const timeRange = `${secondsToSrtTimestamp(cue.start)} --> ${secondsToSrtTimestamp(cue.end)}`
      return `${sequenceNumber}\n${timeRange}\n${cue.text}\n`
    })
    .join('\n')
}

/**
 * دمج مساري ترجمة في ملف SRT واحد ثنائي اللغة (كل مقطع يحوي السطرين معاً)
 * — يعتمد على قائمة المقاطع الموحّدة الناتجة عن pairCuesIntoSlices حتى
 * تبقى النتيجة متسقة تماماً مع ما يراه المستخدم فعلياً في لوحة النص
 */
export function pairedSlicesToSrt(
  slices: { start: number; end: number; sourceText: string | null; translationText: string | null }[],
): string {
  return slices
    .filter((slice) => slice.sourceText || slice.translationText)
    .map((slice, index) => {
      const sequenceNumber = index + 1
      const timeRange = `${secondsToSrtTimestamp(slice.start)} --> ${secondsToSrtTimestamp(slice.end)}`
      const lines = [slice.sourceText, slice.translationText].filter(Boolean).join('\n')
      return `${sequenceNumber}\n${timeRange}\n${lines}\n`
    })
    .join('\n')
}

/** تشغيل تنزيل ملف نصي من المتصفح مباشرة، دون أي طلب شبكي (كل شيء محلي) */
export function downloadTextFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // تحرير الذاكرة المخصصة للرابط المؤقت فور اكتمال التنزيل
  URL.revokeObjectURL(url)
}
