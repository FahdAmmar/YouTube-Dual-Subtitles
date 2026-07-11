import { useMemo } from 'react'
import { findActiveCue } from '@/lib/subtitles/findActiveCue'
import type { SubtitleCue } from '@/types/subtitle.types'

/**
 * Hook رقيق يربط بين وقت الفيديو الحالي ومصفوفة مقاطع الترجمة، ويُعيد
 * المقطع النشط فقط عند الحاجة. استخدام useMemo هنا يمنع إعادة تنفيذ البحث
 * الثنائي في حال لم يتغيّر currentTime أو cues بين عمليات إعادة الرسم
 * (مثال: إعادة رسم ناتجة عن تفاعل في لوحة الإعدادات لا علاقة له بالوقت)
 */
export function useActiveCue(cues: SubtitleCue[], currentTime: number): SubtitleCue | null {
  return useMemo(() => findActiveCue(cues, currentTime), [cues, currentTime])
}
