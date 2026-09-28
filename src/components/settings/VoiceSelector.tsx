import { useState } from 'react'
import { Volume2 } from 'lucide-react'
import { useSpeechVoices } from '@/hooks/useSpeechVoices'
import { filterVoicesByLanguage, getSavedVoiceUri, saveVoiceUri } from '@/lib/utils/speechVoices'
import { speakText } from '@/lib/utils/textToSpeech'
import { getLanguageByCode } from '@/constants/languages'

interface VoiceSelectorProps {
  languageCode: string
  languageLabel: string
}

const AUTO_VALUE = ''

/**
 * اختيار صوت النطق للغة مسار معيّن من الأصوات المتاحة فعلياً على هذا
 * الجهاز. الاختيار محفوظ لكل لغة على حدة (لا صوت عالمي واحد، فالصوت
 * الألماني لا ينطق العربية) ويُستخدم تلقائياً في أزرار نطق المقاطع
 */
export function VoiceSelector({ languageCode, languageLabel }: VoiceSelectorProps) {
  const allVoices = useSpeechVoices()
  const voices = filterVoicesByLanguage(allVoices, languageCode)
  const localVoices = voices.filter((voice) => voice.localService)
  const networkVoices = voices.filter((voice) => !voice.localService)

  // القيمة المحفوظة تُقرأ فوراً (قد تكون قائمة الأصوات فارغة بعد لأن Chrome
  // يحمّلها لاحقاً)، وتُعرض فقط إن كان الصوت متاحاً فعلاً، وإلا "تلقائي"
  const [selectedUri, setSelectedUri] = useState(() => getSavedVoiceUri(languageCode) ?? AUTO_VALUE)
  const effectiveUri = voices.some((voice) => voice.voiceURI === selectedUri) ? selectedUri : AUTO_VALUE

  const selectId = `voice-select-${languageCode}`
  const sample = getLanguageByCode(languageCode)?.speechSample

  function handleChange(uri: string) {
    setSelectedUri(uri)
    saveVoiceUri(languageCode, uri || null)
  }

  return (
    <div className="flex flex-col gap-2 border-s-4 border-border ps-4">
      <label htmlFor={selectId} className="text-sm font-semibold text-text-primary">
        صوت نطق {languageLabel}
      </label>

      {voices.length === 0 ? (
        <p className="text-xs text-text-muted">
          لا توجد أصوات متاحة لهذه اللغة على جهازك أو متصفحك حالياً. يمكنك تثبيت صوت لها من إعدادات
          نظام التشغيل (الكلام / Text-to-Speech)، وسيظهر هنا تلقائياً.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <select
              id={selectId}
              value={effectiveUri}
              onChange={(event) => handleChange(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
            >
              <option value={AUTO_VALUE}>تلقائي (الصوت الافتراضي للمتصفح)</option>
              {localVoices.length > 0 && (
                <optgroup label="أصوات محلية (نظام التشغيل)">
                  {localVoices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} — {voice.lang}
                    </option>
                  ))}
                </optgroup>
              )}
              {networkVoices.length > 0 && (
                <optgroup label="أصوات شبكية (عبر الإنترنت)">
                  {networkVoices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} — {voice.lang}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {sample && (
              <button
                type="button"
                onClick={() => speakText(sample, languageCode)}
                aria-label={`تجربة صوت ${languageLabel}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:text-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
              >
                <Volume2 size={15} aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="text-xs text-text-muted">
            {voices.length} صوت متاح لهذه اللغة ({localVoices.length} محلي، {networkVoices.length} شبكي)
          </p>
        </>
      )}
    </div>
  )
}
