/**
 * تحميل سكربت YouTube IFrame Player API بشكل كسول (Lazy) وآمن من التكرار
 *
 * ملاحظة مهمة: هذه الواجهة (IFrame Player API) لا تتطلب مفتاح API على
 * الإطلاق — فقط لتشغيل الفيديو والتحكم به (تشغيل/إيقاف/تقديم/الحصول على
 * الوقت الحالي). هذا يبقي التطبيق بالكامل من جهة العميل دون أي حاجة
 * لتخزين مفاتيح سرية أو خادم وسيط.
 *
 * نستخدم متغيراً وحيداً (Promise) لضمان عدم حقن السكربت أكثر من مرة حتى
 * لو استدعت عدة مكوّنات هذه الدالة بالتوازي.
 */

let apiReadyPromise: Promise<void> | null = null

export function loadYouTubeIframeAPI(): Promise<void> {
  // إذا كانت الواجهة محمّلة مسبقاً (مثال: تنقّل المستخدم بين صفحات SPA)
  if (window.YT?.Player) {
    return Promise.resolve()
  }

  if (apiReadyPromise) {
    return apiReadyPromise
  }

  apiReadyPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById('youtube-iframe-api')
    if (!existingScript) {
      const script = document.createElement('script')
      script.id = 'youtube-iframe-api'
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.onerror = () => reject(new Error('فشل تحميل مشغّل يوتيوب'))
      document.head.appendChild(script)
    }

    // يوتيوب يستدعي هذه الدالة العامة تلقائياً بعد اكتمال تحميل السكربت
    window.onYouTubeIframeAPIReady = () => resolve()
  })

  return apiReadyPromise
}
