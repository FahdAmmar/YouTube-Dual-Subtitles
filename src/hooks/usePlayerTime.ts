import { useCallback, useSyncExternalStore } from 'react'

/** معدّل استطلاع الوقت الحالي أثناء التشغيل (بالميلي ثانية)
 *  120ms يكفي لمزامنة سلسة بصرياً (أسرع من قدرة العين على ملاحظة التأخير)
 *  دون إثقال المتصفح باستدعاءات لا داعي لها 60 مرة في الثانية */
const TIME_POLL_INTERVAL_MS = 120

/**
 * Hook يشترك في الوقت الحالي لمشغّل يوتيوب عبر useSyncExternalStore —
 * نمط React 18 القياسي للاشتراك في مصدر بيانات خارجي عن React (هنا:
 * getCurrentTime() الخاصة بمشغّل يوتيوب) دون الحاجة لتمرير هذه الحالة
 * عبر الشجرة أو الاحتفاظ بها في مكوّن أعلى مستوى.
 *
 * الفائدة الجوهرية: فقط المكوّن الذي يستدعي هذا الـ Hook (DualSubtitleDisplay)
 * يُعاد رسمه كل 120ms أثناء التشغيل. أي مكوّن آخر في الشجرة (الرأس، نموذج
 * الرابط، بطاقات الرفع...) لا "يشترك" في هذا التحديث إطلاقاً فيبقى ساكناً
 * تماماً، خلافاً لو كانت currentTime حالة React عادية في مكوّن أعلى.
 */
export function usePlayerTime(getCurrentTime: () => number, isPlaying: boolean): number {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!isPlaying) return () => {}
      const intervalId = window.setInterval(onStoreChange, TIME_POLL_INTERVAL_MS)
      return () => window.clearInterval(intervalId)
    },
    [isPlaying],
  )

  return useSyncExternalStore(subscribe, getCurrentTime, getCurrentTime)
}
