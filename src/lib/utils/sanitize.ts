/**
 * أدوات تعقيم بسيطة تُستخدم كطبقة حماية دفاعية إضافية (Defense in Depth)
 *
 * ملاحظة أساسية حول أمان هذا التطبيق ضد XSS:
 * React يقوم تلقائياً بتحويل أي نص يُعرض عبر {variable} داخل JSX إلى
 * عقدة نصية (Text Node) آمنة، دون تفسيره كـ HTML. لذلك لا نستخدم في أي
 * مكان من هذا التطبيق الخاصية dangerouslySetInnerHTML لعرض نص الترجمة أو
 * اسم الملف — وهذا هو خط الدفاع الأساسي. الدوال هنا للاستخدامات النادرة
 * التي تحتاج نصاً "نظيفاً" خارج شجرة React (مثل عناوين الصفحة أو التصدير)
 */

/** تقصير النصوص الطويلة جداً (مثل أسماء الملفات) مع الحفاظ على وضوحها */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

/** إزالة أي وسوم HTML من نص عادي، للاستخدام خارج سياق React عند الحاجة */
export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}
