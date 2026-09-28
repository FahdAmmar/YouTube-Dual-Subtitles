import { resolvePreferredVoice } from './speechVoices'

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

/**
 * ينطق نصاً واحداً، ويلغي أي نطق سابق قيد التشغيل أولاً — نقر زر النطق
 * على مقطعين متتاليين بسرعة يجب أن يُقاطع الأول بدل تكديسهما في طابور
 */
export function speakText(text: string, lang?: string): void {
  if (!isSpeechSupported() || !text.trim()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  if (lang) {
    utterance.lang = lang
    // الصوت الذي اختاره المستخدم لهذه اللغة (إن وُجد ولا يزال متاحاً)؛
    // lang يُضبط أولاً ثم يُستبدل بلغة الصوت نفسه لأن Chrome يتجاهل الصوت
    // إن اختلفت لغته عن لغة الـutterance
    const voice = resolvePreferredVoice(lang)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    }
  }
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return
  window.speechSynthesis.cancel()
}
