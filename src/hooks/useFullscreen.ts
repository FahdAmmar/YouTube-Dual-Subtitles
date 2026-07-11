import { useCallback, useEffect, useState, type RefObject } from 'react'

/**
 * Hook عام (قابل لإعادة الاستخدام) للتحكم بملء الشاشة عبر أي عنصر DOM
 * نستخدم Fullscreen API القياسي مباشرة (وليس ميزة ملء الشاشة الخاصة
 * بيوتيوب) لأن عناصر التحكم أصبحت مخصصة بالكامل (controls: 0)، فيجب أن
 * يشمل ملء الشاشة الحاوية بأكملها (الفيديو + الترجمة المُطبَّقة فوقه +
 * شريط التحكم المخصص) لا مشغّل يوتيوب وحده
 */
export function useFullscreen(elementRef: RefObject<HTMLElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleChange = () => setIsFullscreen(document.fullscreenElement === elementRef.current)
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [elementRef])

  const toggleFullscreen = useCallback(() => {
    const element = elementRef.current
    if (!element) return

    try {
      if (document.fullscreenElement) {
        if (typeof document.exitFullscreen === 'function') {
          document.exitFullscreen().catch(() => {
            // بعض المتصفحات قد ترفض الطلب — تجاهل بأمان
          })
        }
        return
      }

      if (typeof element.requestFullscreen === 'function') {
        element.requestFullscreen().catch(() => {
          // بعض المتصفحات (مثال: Safari على iOS) قد ترفض الطلب — تجاهل بأمان
        })
      }
      // في حال عدم توفر Fullscreen API إطلاقاً (مثال: تشغيل التطبيق داخل
      // إطار iframe بدون الصلاحية allow="fullscreen")، لا تُنفَّذ أي عملية
      // بصمت بدل رمي استثناء متزامن كان سيصل مباشرة إلى معالج النقر ويُفشل
      // التفاعل دون أي تفسير للمستخدم
    } catch {
      // حماية إضافية من أي استثناء متزامن غير متوقع من واجهة المتصفح نفسها
    }
  }, [elementRef])

  return { isFullscreen, toggleFullscreen }
}
