import { useCallback, useEffect, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import type { ResolvedTheme, ThemePreference } from '@/types/theme.types'

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * قراءة تفضيل النظام الحالي بأمان
 *
 * إصلاح خطأ حرج (Bug Fix): الكود السابق كان يستدعي window.matchMedia
 * مباشرة دون أي تحقق من توفرها فعلياً كدالة صالحة للاستدعاء. رغم أن كل
 * المتصفحات الحديثة توفرها، إلا أن بعض البيئات (متصفحات مضمّنة/Webviews
 * مقيّدة، أطر iframe مع سياسات صارمة، أو أدوات معاينة مُحتواة) قد لا
 * توفرها أو توفر تطبيقاً غير مكتمل لها. عند فشل هذا الاستدعاء بدون حماية،
 * كان الاستثناء الناتج يحدث أثناء أول Render لـ ThemeProvider (وهو أعلى
 * الشجرة تقريباً، يغلّف التطبيق بالكامل)، فيلتقطه ErrorBoundary الجذري
 * ويستبدل الصفحة بأكملها بشاشة "حدث خطأ غير متوقع" — وهذا هو تحديداً ما
 * ظهر في لقطة الشاشة المرفقة. التغليف بـ try/catch هنا (بنفس نمط الحماية
 * المُتّبع فعلياً في useLocalStorage) يضمن عدم توقف التطبيق بالكامل مهما
 * كانت بيئة التشغيل، مع رجوع آمن للسمة الداكنة كافتراضي منطقي
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  try {
    if (typeof window.matchMedia !== 'function') return 'dark'
    return window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light'
  } catch {
    return 'dark'
  }
}

/** إنشاء مستمع آمن لتغيّر تفضيل النظام؛ يُعيد null إن تعذّر ذلك بأي شكل (بدل رمي استثناء يوقف التطبيق) */
function safeWatchSystemTheme(onChange: () => void): (() => void) | null {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
    const mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY)
    if (!mediaQuery || typeof mediaQuery.addEventListener !== 'function') return null
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  } catch {
    return null
  }
}

/**
 * Hook لإدارة السمة (Theme) الكاملة للتطبيق:
 * - يحترم تفضيل نظام التشغيل عند أول زيارة (متطلب صريح من المستخدم)
 * - يسمح للمستخدم بالتجاوز اليدوي (فاتح/داكن) ويحفظ اختياره في التخزين المحلي
 * - يستمع لتغيّر تفضيل النظام لحظياً (مثال: تفعيل "الوضع الليلي" في نظام
 *   التشغيل بينما التطبيق مفتوح) طالما لم يختر المستخدم تفضيلاً يدوياً
 * - يطبّق السمة عبر خاصية data-theme على عنصر <html> لتتحكم بها ملفات CSS
 */
export function useTheme() {
  const [preference, setPreference] = useLocalStorage<ThemePreference>(
    STORAGE_KEYS.THEME,
    'system',
  )
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    preference === 'system' ? getSystemTheme() : preference,
  )

  // تطبيق السمة الفعلية على الجذر + الاستماع لتغيّر تفضيل النظام
  useEffect(() => {
    const applyResolved = () => {
      const next = preference === 'system' ? getSystemTheme() : preference
      setResolvedTheme(next)
      document.documentElement.setAttribute('data-theme', next)
    }

    applyResolved()

    if (preference !== 'system') return

    // استخدام النسخة الآمنة بدل استدعاء matchMedia مباشرة هنا أيضاً —
    // نفس سبب الحماية الموجودة في getSystemTheme أعلاه
    return safeWatchSystemTheme(applyResolved) ?? undefined
  }, [preference])

  const toggleTheme = useCallback(() => {
    setPreference(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setPreference])

  return { preference, resolvedTheme, setPreference, toggleTheme }
}
