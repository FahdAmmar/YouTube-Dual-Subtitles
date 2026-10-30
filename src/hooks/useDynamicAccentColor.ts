import { useEffect } from 'react'
import { deriveAccentPair } from '@/lib/utils/color'
import type { ResolvedTheme } from '@/types/theme.types'

/** متغيرات CSS التي يُعاد اشتقاقها ديناميكياً — لون النظام نفسه، وهالة الخلفية الأساسية (BackgroundFX) لتماسك بصري كامل */
const CONSOLE_VAR = '--rgb-console'
const CONSOLE_HOVER_VAR = '--rgb-console-hover'
const AURORA_PRIMARY_VAR = '--aurora-a'

/**
 * يجعل لون تمييز الموقع بأكمله (حلقات التركيز، الأزرار، توهج المقطع
 * النشط، الهالة الخلفية) مشتقاً حياً من لون مسار الترجمة الأجنبية
 * (trackB — الإنجليزية) الذي يختاره المستخدم، بدل لون بنفسجي ثابت لا
 * علاقة له بتخصيصه. يبقى هذا فقط لوناً مُشتَقاً وآمناً للتباين (انظر
 * deriveAccentPair) — لون نص الترجمة الفعلي في السطر نفسه لا يتغيّر إطلاقاً
 *
 * التنظيف عند إلغاء التركيب (أو تعذّر الاشتقاق) يعيد القيمة للسلسلة
 * المعرَّفة أصلاً في index.css عبر إزالة الخاصية المضبوطة يدوياً، بدل ترك
 * قيمة "مُعلَّقة" بعد تفكيك المكوّن — مهم خصوصاً أثناء الاختبارات حيث قد
 * تتشارك عدة اختبارات نفس document بين بعضها
 */
export function useDynamicAccentColor(trackBColorHex: string, theme: ResolvedTheme, isEnabled = true): void {
  useEffect(() => {
    // Opt-in (SubtitleDisplaySettings.adaptiveAccent): when off, the accent stays the one defined in index.css
    if (!isEnabled) return

    const root = document.documentElement
    const pair = deriveAccentPair(trackBColorHex, theme)

    if (!pair) return

    root.style.setProperty(CONSOLE_VAR, pair.base)
    root.style.setProperty(CONSOLE_HOVER_VAR, pair.hover)
    root.style.setProperty(AURORA_PRIMARY_VAR, pair.base)

    return () => {
      root.style.removeProperty(CONSOLE_VAR)
      root.style.removeProperty(CONSOLE_HOVER_VAR)
      root.style.removeProperty(AURORA_PRIMARY_VAR)
    }
  }, [trackBColorHex, theme, isEnabled])
}
