import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useSpeechVoices } from '@/hooks/useSpeechVoices'
import { filterVoicesByLanguage, getSavedVoiceUri, saveVoiceUri, describeVoiceLanguage } from '@/lib/utils/speechVoices'
import { getLanguageByCode } from '@/constants/languages'
import { VoicePickerModal } from './VoicePickerModal'

interface VoiceSelectorProps {
  languageCode: string
  languageLabel: string
}

const AUTO_VALUE = ''

/**
 * صفّ اختيار صوت النطق للغة مسار معيّن ضمن لوحة الإعدادات: يعرض ملخّص
 * الاختيار الحالي، ويفتح VoicePickerModal لاستعراض كل الأصوات المتاحة
 * فعلياً على هذا الجهاز مع معاينة صوتية لكل واحد. الاختيار محفوظ لكل
 * لغة على حدة (الصوت الألماني لا ينطق العربية) ويُستخدم تلقائياً في
 * أزرار نطق المقاطع
 */
export function VoiceSelector({ languageCode, languageLabel }: VoiceSelectorProps) {
  const allVoices = useSpeechVoices()
  const voices = filterVoicesByLanguage(allVoices, languageCode)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  // القيمة المحفوظة تُعرض فقط إن كان الصوت لا يزال متاحاً فعلياً، وإلا "تلقائي"
  const savedUri = getSavedVoiceUri(languageCode)
  const selectedUri = savedUri && voices.some((voice) => voice.voiceURI === savedUri) ? savedUri : AUTO_VALUE
  const selectedVoice = voices.find((voice) => voice.voiceURI === selectedUri)

  const sample = getLanguageByCode(languageCode)?.speechSample ?? ''

  function handleSelect(voiceUri: string | null) {
    saveVoiceUri(languageCode, voiceUri)
  }

  return (
    <div className="flex flex-col gap-2 border-s-4 border-border ps-4">
      <span className="text-sm font-semibold text-text-primary">
        صوت نطق {languageLabel}
      </span>

      {voices.length === 0 ? (
        <p className="text-xs text-text-muted">
          لا توجد أصوات متاحة لهذه اللغة على جهازك أو متصفحك حالياً. يمكنك تثبيت صوت لها من إعدادات
          نظام التشغيل (الكلام / Text-to-Speech)، وسيظهر هنا تلقائياً.
        </p>
      ) : (
        <>
          <button
            type="button"
            aria-label={`تغيير صوت نطق ${languageLabel} — الحالي: ${selectedVoice?.name ?? 'تلقائي'}`}
            onClick={() => setIsPickerOpen(true)}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-start transition-colors hover:border-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-text-primary">
                {selectedVoice?.name ?? 'تلقائي'}
              </span>
              <span className="truncate text-xs text-text-muted">
                {selectedVoice ? describeVoiceLanguage(selectedVoice.lang) : 'صوت المتصفح الافتراضي لهذه اللغة'}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-console">
              تغيير
              <ChevronLeft size={14} aria-hidden="true" />
            </span>
          </button>

          <p className="text-xs text-text-muted">{voices.length} صوت متاح لهذه اللغة</p>

          <VoicePickerModal
            isOpen={isPickerOpen}
            onClose={() => setIsPickerOpen(false)}
            languageCode={languageCode}
            languageLabel={languageLabel}
            sample={sample}
            voices={voices}
            selectedUri={selectedUri}
            onSelect={handleSelect}
          />
        </>
      )}
    </div>
  )
}
