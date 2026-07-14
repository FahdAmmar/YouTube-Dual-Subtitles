import type { SubtitleDisplaySettings } from '@/types/theme.types'

/** مفاتيح التخزين المحلي (localStorage) — مجمّعة هنا لتفادي تكرار السلاسل النصية */
export const STORAGE_KEYS = {
  THEME: 'ydc:theme-preference',
  SUBTITLE_SETTINGS: 'ydc:subtitle-display-settings',
  SUBTITLE_OVERLAY_POSITION: 'ydc:subtitle-overlay-position',
  SIDEBAR_POSITION: 'ydc:sidebar-position',
} as const

/**
 * الإعدادات الافتراضية لعرض الترجمة عند أول استخدام للتطبيق
 *
 * تحديث: رُفعت القيم الافتراضية (كانتا 22/22 سابقاً) ليكون نص الترجمة
 * أكبر ووضوحاً منذ أول استخدام دون الحاجة لفتح لوحة الإعدادات يدوياً.
 * كلا الحجمين يبقيان قابلين للتعديل الكامل من قِبل المستخدم لاحقاً ضمن
 * النطاق [14px – 40px] المحدَّد في FontSizeControl
 */
export const DEFAULT_SUBTITLE_SETTINGS: SubtitleDisplaySettings = {
  trackA: {
    fontSize: 20,
    color: '#E8B44C', // أصفر الترجمة الكلاسيكي — لون المسار الأول (العربية)
  },
  trackB: {
    fontSize: 26,
    color: '#4FC7BE', // أزرق مخضر — لون المسار الثاني (لغة الفيديو الأجنبية)
  },
  showBackdrop: true,
}
