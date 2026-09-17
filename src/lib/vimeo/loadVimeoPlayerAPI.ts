/**
 * تحميل سكربت Vimeo Player API بشكل كسول (Lazy) وآمن من التكرار — نفس
 * الفلسفة والبنية تماماً في loadYouTubeIframeAPI.ts، بفارق واحد: لا يوجد
 * "استدعاء رد نداء عام" (onYouTubeIframeAPIReady) تُطلقه Vimeo تلقائياً؛
 * توفّر سكربتها الكائن window.Vimeo فور تنفيذه، فيكفي انتظار onload
 */

let apiReadyPromise: Promise<void> | null = null

export function loadVimeoPlayerAPI(): Promise<void> {
  // إذا كانت الواجهة محمّلة مسبقاً (مثال: تنقّل المستخدم بين فيديوهات متعددة)
  if (window.Vimeo?.Player) {
    return Promise.resolve()
  }

  if (apiReadyPromise) {
    return apiReadyPromise
  }

  apiReadyPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById('vimeo-player-api')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => reject(new Error('فشل تحميل مشغّل Vimeo')))
      return
    }

    const script = document.createElement('script')
    script.id = 'vimeo-player-api'
    script.src = 'https://player.vimeo.com/api/player.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      // إعادة ضبط الـ Promise للسماح بمحاولة تحميل جديدة — بدون هذا، سيفشل
      // كل طلب لاحق بنفس الخطأ (خاصة على الشبكات البطيئة/المتقطعة)
      apiReadyPromise = null
      reject(new Error('فشل تحميل مشغّل Vimeo'))
    }
    document.head.appendChild(script)
  })

  return apiReadyPromise
}
