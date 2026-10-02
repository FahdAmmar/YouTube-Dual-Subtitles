import { getSpeechRate, resolvePreferredVoice } from './speechVoices'

/**
 * غلاف رقيق حول Web Speech API (SpeechSynthesis) لنطق نص مقطع الترجمة —
 * قدرة أصلية في المتصفح، بلا أي خدمة خارجية أو مفتاح API. الدعم غير
 * مضمون في كل المتصفحات، لذا isSpeechSupported يتيح إخفاء زر النطق
 * بالكامل بدل عرض تحكّم لا يعمل فعلياً (نفس نمط الحماية المُتّبع في
 * useFullscreen وuseLocalStorage)
 */

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'
}

export interface SpeakOptions {
  /**
   * undefined = الصوت الذي اختاره المستخدم لهذه اللغة (إن وُجد)؛
   * null = صوت المتصفح الافتراضي متجاهلاً الاختيار المحفوظ؛
   * كائن صوت = ذلك الصوت تحديداً (لأزرار "اختبار" قبل الحفظ)
   */
  voice?: SpeechSynthesisVoice | null
  /** تجاوز سرعة النطق المحفوظة لهذه المرة فقط (مثال: تجربة سرعة في لوحة اختيار الصوت قبل حفظها) */
  rate?: number
  /** يُستدعى عند انتهاء النطق (طبيعياً أو بخطأ) — لتبديل أيقونة تشغيل/إيقاف في أزرار المعاينة */
  onEnd?: () => void
}

/**
 * ينطق نصاً واحداً، ويلغي أي نطق سابق قيد التشغيل أولاً — نقر زر النطق
 * على مقطعين متتاليين بسرعة يجب أن يُقاطع الأول بدل تكديسهما في طابور
 */
export function speakText(text: string, lang?: string, options: SpeakOptions = {}): void {
  if (!isSpeechSupported() || !text.trim()) {
    options.onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = options.rate ?? getSpeechRate()
  if (lang) utterance.lang = lang

  const voice = options.voice === undefined ? (lang ? resolvePreferredVoice(lang) : undefined) : options.voice
  if (voice) {
    utterance.voice = voice
    // Chrome يتجاهل الصوت إن اختلفت لغته عن لغة الـutterance
    utterance.lang = voice.lang
  }
  if (options.onEnd) {
    utterance.onend = options.onEnd
    utterance.onerror = options.onEnd
  }
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return
  window.speechSynthesis.cancel()
}
