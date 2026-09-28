import { STORAGE_KEYS } from '@/constants/theme.constants'

/** خريطة: رمز اللغة الأساسي (مثل "de") → voiceURI للصوت المختار لها */
type VoicePreferences = Record<string, string>

/**
 * رمز اللغة الأساسي من وسم BCP-47: "de-DE" و"de_DE" (صيغة أندرويد) → "de".
 * الأصوات تُصنَّف بهذا الرمز لأن المسارات في التطبيق تحمل رمزاً من حرفين فقط
 */
export function getPrimaryLanguage(tag: string): string {
  return tag.toLowerCase().replace('_', '-').split('-')[0] ?? ''
}

/** الأصوات المتاحة فعلياً في هذا الجهاز/المتصفح للغة معيّنة، مرتّبة بالاسم */
export function filterVoicesByLanguage(
  voices: readonly SpeechSynthesisVoice[],
  languageCode: string,
): SpeechSynthesisVoice[] {
  const target = getPrimaryLanguage(languageCode)
  return voices
    .filter((voice) => getPrimaryLanguage(voice.lang) === target)
    .sort((a, b) => a.name.localeCompare(b.name))
}

function readPreferences(): VoicePreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.SPEECH_VOICES)
    return raw ? (JSON.parse(raw) as VoicePreferences) : {}
  } catch {
    return {}
  }
}

export function getSavedVoiceUri(languageCode: string): string | null {
  return readPreferences()[getPrimaryLanguage(languageCode)] ?? null
}

/** يحفظ اختيار الصوت للغة، أو يمسحه (null = العودة للصوت الافتراضي التلقائي) */
export function saveVoiceUri(languageCode: string, voiceUri: string | null): void {
  const preferences = readPreferences()
  const key = getPrimaryLanguage(languageCode)
  if (voiceUri) preferences[key] = voiceUri
  else delete preferences[key]
  try {
    window.localStorage.setItem(STORAGE_KEYS.SPEECH_VOICES, JSON.stringify(preferences))
  } catch {
    // تجاهل أخطاء الكتابة (مثال: امتلاء الحصة) بنفس نمط بقية المخازن
  }
}

/**
 * الصوت المحفوظ للغة إن كان لا يزال متاحاً على هذا الجهاز؛ وإلا undefined
 * فيختار المتصفح صوته الافتراضي. الحماية ضرورية لأن الأصوات تتغيّر بين
 * الأجهزة والمتصفحات، وقد يُحذف صوت محفوظ لاحقاً من نظام التشغيل
 */
export function resolvePreferredVoice(languageCode: string): SpeechSynthesisVoice | undefined {
  const savedUri = getSavedVoiceUri(languageCode)
  if (!savedUri) return undefined
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  const voices = typeof synth?.getVoices === 'function' ? synth.getVoices() : []
  return voices.find((voice) => voice.voiceURI === savedUri)
}
