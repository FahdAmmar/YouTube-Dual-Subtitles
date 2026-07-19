/**
 * تذييل زجاجي خفيف يطفو فوق خلفية BackgroundFX. شريط فاصل متدرّج ناعم
 * أعلاه (بدل حدّ مصمت) لربط بصري مع الهالات. النص محصور في حدود راحة
 * القراءة (max-w-2xl) ومركّز ليبقى أنيقاً على الشاشات فائقة العرض.
 */
export function Footer() {
  return (
    <footer className="relative z-20 px-4 py-6 text-center sm:px-6">
      <div
        aria-hidden="true"
        className="mx-auto mb-5 h-px w-full max-w-xs bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <p className="mx-auto max-w-2xl text-xs leading-relaxed text-text-muted">
        يعمل هذا التطبيق بالكامل من متصفحك — لا تُرفع ملفات الترجمة إلى أي خادم.
        الرجاء رفع ملفات ترجمة تملك حق استخدامها فقط.
      </p>
    </footer>
  )
}
