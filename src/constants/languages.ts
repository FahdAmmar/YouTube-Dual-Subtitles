/**
 * قائمة اللغات المدعومة في التطبيق
 *
 * تصميم هذا الملف كمصفوفة بيانات منفصلة (وليس Enum أو قيم مبعثرة في الكود)
 * يحقق متطلب "بنية مرنة لدعم إضافة لغات جديدة بسهولة مستقبلاً": لإضافة لغة
 * جديدة، يكفي إضافة عنصر واحد هنا دون لمس أي مكوّن آخر في التطبيق.
 */

export interface LanguageOption {
  /** رمز اللغة وفق ISO 639-1 */
  code: string
  /** الاسم المعروض بالعربية */
  labelAr: string
  /** الاسم المعروض بلغته الأصلية (مفيد عند البحث عن اللغة في القائمة) */
  labelNative: string
  /** اتجاه الكتابة الافتراضي لهذه اللغة */
  direction: 'ltr' | 'rtl'
}

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  { code: 'ar', labelAr: 'العربية', labelNative: 'العربية', direction: 'rtl' },
  { code: 'en', labelAr: 'الإنجليزية', labelNative: 'English', direction: 'ltr' },
  { code: 'fr', labelAr: 'الفرنسية', labelNative: 'Français', direction: 'ltr' },
  { code: 'es', labelAr: 'الإسبانية', labelNative: 'Español', direction: 'ltr' },
  { code: 'de', labelAr: 'الألمانية', labelNative: 'Deutsch', direction: 'ltr' },
  { code: 'it', labelAr: 'الإيطالية', labelNative: 'Italiano', direction: 'ltr' },
  { code: 'pt', labelAr: 'البرتغالية', labelNative: 'Português', direction: 'ltr' },
  { code: 'tr', labelAr: 'التركية', labelNative: 'Türkçe', direction: 'ltr' },
  { code: 'fa', labelAr: 'الفارسية', labelNative: 'فارسی', direction: 'rtl' },
  { code: 'ur', labelAr: 'الأردية', labelNative: 'اردو', direction: 'rtl' },
  { code: 'he', labelAr: 'العبرية', labelNative: 'עברית', direction: 'rtl' },
  { code: 'ru', labelAr: 'الروسية', labelNative: 'Русский', direction: 'ltr' },
  { code: 'zh', labelAr: 'الصينية', labelNative: '中文', direction: 'ltr' },
  { code: 'ja', labelAr: 'اليابانية', labelNative: '日本語', direction: 'ltr' },
  { code: 'ko', labelAr: 'الكورية', labelNative: '한국어', direction: 'ltr' },
  { code: 'hi', labelAr: 'الهندية', labelNative: 'हिन्दी', direction: 'ltr' },
  { code: 'id', labelAr: 'الإندونيسية', labelNative: 'Bahasa Indonesia', direction: 'ltr' },
  { code: 'nl', labelAr: 'الهولندية', labelNative: 'Nederlands', direction: 'ltr' },
] as const

/** دالة مساعدة للبحث السريع عن بيانات لغة عبر رمزها */
export function getLanguageByCode(code: string): LanguageOption | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)
}
