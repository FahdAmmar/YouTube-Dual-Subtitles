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
  /** جملة قصيرة تُنطق عند "تجربة الصوت" في الإعدادات */
  speechSample: string
}

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  { code: 'ar', labelAr: 'العربية', labelNative: 'العربية', direction: 'rtl', speechSample: 'مرحباً، كيف حالك؟' },
  { code: 'en', labelAr: 'الإنجليزية', labelNative: 'English', direction: 'ltr', speechSample: 'Hello, how are you?' },
  { code: 'fr', labelAr: 'الفرنسية', labelNative: 'Français', direction: 'ltr', speechSample: 'Bonjour, comment allez-vous ?' },
  { code: 'es', labelAr: 'الإسبانية', labelNative: 'Español', direction: 'ltr', speechSample: 'Hola, ¿cómo estás?' },
  { code: 'de', labelAr: 'الألمانية', labelNative: 'Deutsch', direction: 'ltr', speechSample: 'Hallo, wie geht es dir?' },
  { code: 'it', labelAr: 'الإيطالية', labelNative: 'Italiano', direction: 'ltr', speechSample: 'Ciao, come stai?' },
  { code: 'pt', labelAr: 'البرتغالية', labelNative: 'Português', direction: 'ltr', speechSample: 'Olá, como você está?' },
  { code: 'tr', labelAr: 'التركية', labelNative: 'Türkçe', direction: 'ltr', speechSample: 'Merhaba, nasılsın?' },
  { code: 'fa', labelAr: 'الفارسية', labelNative: 'فارسی', direction: 'rtl', speechSample: 'سلام، حال شما چطور است؟' },
  { code: 'ur', labelAr: 'الأردية', labelNative: 'اردو', direction: 'rtl', speechSample: 'ہیلو، آپ کیسے ہیں؟' },
  { code: 'he', labelAr: 'العبرية', labelNative: 'עברית', direction: 'rtl', speechSample: 'שלום, מה שלומך?' },
  { code: 'ru', labelAr: 'الروسية', labelNative: 'Русский', direction: 'ltr', speechSample: 'Здравствуйте, как дела?' },
  { code: 'zh', labelAr: 'الصينية', labelNative: '中文', direction: 'ltr', speechSample: '你好，你好吗？' },
  { code: 'ja', labelAr: 'اليابانية', labelNative: '日本語', direction: 'ltr', speechSample: 'こんにちは、お元気ですか？' },
  { code: 'ko', labelAr: 'الكورية', labelNative: '한국어', direction: 'ltr', speechSample: '안녕하세요, 잘 지내세요?' },
  { code: 'hi', labelAr: 'الهندية', labelNative: 'हिन्दी', direction: 'ltr', speechSample: 'नमस्ते, आप कैसे हैं?' },
  { code: 'id', labelAr: 'الإندونيسية', labelNative: 'Bahasa Indonesia', direction: 'ltr', speechSample: 'Halo, apa kabar?' },
  { code: 'nl', labelAr: 'الهولندية', labelNative: 'Nederlands', direction: 'ltr', speechSample: 'Hallo, hoe gaat het?' },
] as const

/** دالة مساعدة للبحث السريع عن بيانات لغة عبر رمزها */
export function getLanguageByCode(code: string): LanguageOption | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)
}
