import { useCallback, useState } from 'react'

/**
 * Hook عام (Generic) لحفظ واسترجاع أي قيمة من localStorage مع الحفاظ على
 * نفس واجهة useState المألوفة. مصمم كوحدة واحدة قابلة لإعادة الاستخدام
 * لتفادي تكرار منطق try/catch والتحويل من/إلى JSON في كل مكان يحتاج حفظاً
 * (مبدأ DRY) — يُستخدم لحفظ تفضيل السمة وإعدادات عرض الترجمة.
 *
 * التعامل الآمن مع الأخطاء: بعض المتصفحات (وضع التصفح الخاص، أو تجاوز
 * الحصة المخصصة) قد ترفض القراءة أو الكتابة في localStorage، لذلك تُغلَّف
 * كل عملية بـ try/catch مع الرجوع للقيمة الافتراضية بدل تعطّل التطبيق.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((previous: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setValue = useCallback(
    (value: T | ((previous: T) => T)) => {
      setStoredValue((previous) => {
        const next = value instanceof Function ? value(previous) : value
        try {
          window.localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // تجاهل أخطاء الكتابة (مثال: امتلاء الحصة المخصصة) دون تعطيل الواجهة
        }
        return next
      })
    },
    [key],
  )

  return [storedValue, setValue]
}
