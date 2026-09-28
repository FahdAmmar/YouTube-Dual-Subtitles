import { useCallback, useEffect, useRef, useState } from 'react'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { UseVideoPlayerResult } from './useVideoPlayer'

/** فترة استطلاع الوقت لكشف نهاية المقطع — نفس القيمة المعتمدة في useSceneRepeat لتوازن مماثل بين الاستجابة وكلفة الاستطلاع */
const SHADOWING_POLL_INTERVAL_MS = 200

export interface UseShadowingModeResult {
  isEnabled: boolean
  toggle: () => void
}

/**
 * "وضع التظليل" (Shadowing): تمرين شائع في تعلّم اللغة يقوم على تكرار
 * الجملة المسموعة بصوت عالٍ بعد سماعها مباشرة. عند تفعيل هذا الوضع،
 * يُوقَف الفيديو تلقائياً وبمفرده بمجرد انتهاء كل مقطع ترجمة، مانحاً
 * المستخدم وقتاً غير محدود للتكرار قبل الضغط يدوياً على تشغيل للمتابعة
 * للمقطع التالي — بلا حاجة للمس شريط الإيقاف المؤقت في كل مرة بنفسه.
 *
 * كشف "نهاية المقطع" هنا مختلف عمداً عن useSceneRepeat: لا يعتمد على
 * سكونEnd ثابت واحد (فلا يوجد "مقطع مُختار" هنا، بل كل مقطع في تسلسله)،
 * بل يقارن originalIndex المقطع النشط حالياً بالمقطع السابق مباشرة —
 * فإن كان تالياً له *تماماً* في التسلسل (progression.previous + 1)، فهذا
 * يعني أن المقطع السابق انتهى للتو بتشغيل طبيعي متتابع، فيُوقَف الفيديو.
 * أي انتقال آخر (قفزة يدوية عبر شريط التقدّم أو قائمة النص، مثلاً) لا
 * يُطابق هذا الشرط، فيُحدَّث المرجع بصمت بلا أي إيقاف مفاجئ غير متوقَّع.
 */
export function useShadowingMode(
  player: UseVideoPlayerResult,
  slices: PairedSlice[],
  isPlaying: boolean,
): UseShadowingModeResult {
  const [isEnabled, setIsEnabled] = useState(false)

  const slicesRef = useRef(slices)
  slicesRef.current = slices
  const playerRef = useRef(player)
  playerRef.current = player

  // آخر originalIndex شُوهد أثناء التشغيل — null تعني "لم يبدأ التتبّع
  // بعد"، فلا يُوقَف الفيديو عند أول مقطع يظهر فور تفعيل الوضع أو بدء التشغيل
  const previousIndexRef = useRef<number | null>(null)

  const toggle = useCallback(() => {
    setIsEnabled((previous) => !previous)
    // إعادة ضبط التتبّع عند كل تبديل: تفعيل الوضع منتصف مقطع لا يجب أن
    // يُوقَف الفيديو فوراً عند أول كشف للمقطع الحالي نفسه
    previousIndexRef.current = null
  }, [])

  useEffect(() => {
    if (!isEnabled || !isPlaying) return

    const intervalId = setInterval(() => {
      const currentSlices = slicesRef.current
      if (currentSlices.length === 0) return
      const t = playerRef.current.getCurrentTime()
      const current = currentSlices.find((s) => t >= s.start && t < s.end)
      if (!current) return

      const previousIndex = previousIndexRef.current
      if (previousIndex !== null && current.originalIndex === previousIndex + 1) {
        playerRef.current.pause()
      }
      previousIndexRef.current = current.originalIndex
    }, SHADOWING_POLL_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [isEnabled, isPlaying])

  return { isEnabled, toggle }
}
