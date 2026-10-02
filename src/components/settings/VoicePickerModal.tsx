import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Square, Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { cn } from '@/lib/utils/cn'
import { speakText, stopSpeaking } from '@/lib/utils/textToSpeech'
import { describeVoiceLanguage, SPEECH_RATES, getSpeechRate, saveSpeechRate } from '@/lib/utils/speechVoices'

const AUTO_VALUE = ''

interface VoicePickerModalProps {
  isOpen: boolean
  onClose: () => void
  languageCode: string
  languageLabel: string
  sample: string
  voices: SpeechSynthesisVoice[]
  selectedUri: string
  onSelect: (voiceUri: string | null) => void
}

/**
 * حوار مخصّص لاستعراض كل أصوات لغة معيّنة المتاحة فعلياً على هذا
 * الجهاز/المتصفح واختيار واحد منها، مع معاينة صوتية فورية لكل صف قبل
 * الاختيار وضبط سرعة نطق مشتركة — بديل عن قائمة <select> المسطّحة التي
 * لا تتيح تجربة الصوت قبل اختياره
 */
export function VoicePickerModal({
  isOpen,
  onClose,
  languageCode,
  languageLabel,
  sample,
  voices,
  selectedUri,
  onSelect,
}: VoicePickerModalProps) {
  const dialogRef = useDialogFocusTrap(isOpen, onClose)
  const [playingUri, setPlayingUri] = useState<string | null>(null)
  const [rate, setRate] = useState(() => getSpeechRate())

  // إيقاف أي معاينة صوتية قيد التشغيل عند إغلاق الحوار — لا يجب أن يستمر
  // صوت التجربة بعد اختفاء اللوحة التي بدأته
  useEffect(() => {
    if (!isOpen) {
      stopSpeaking()
      setPlayingUri(null)
    }
  }, [isOpen])

  function togglePreview(voice: SpeechSynthesisVoice | null, uri: string) {
    if (playingUri === uri) {
      stopSpeaking()
      setPlayingUri(null)
      return
    }
    setPlayingUri(uri)
    speakText(sample, languageCode, {
      voice,
      rate,
      onEnd: () => setPlayingUri((current) => (current === uri ? null : current)),
    })
  }

  function handleRateChange(nextRate: number) {
    setRate(nextRate)
    saveSpeechRate(nextRate)
  }

  function handleSelect(voiceUri: string | null) {
    onSelect(voiceUri)
    onClose()
  }

  const rows: { uri: string; voice: SpeechSynthesisVoice | null; name: string; description: string }[] = [
    { uri: AUTO_VALUE, voice: null, name: 'تلقائي', description: 'صوت المتصفح الافتراضي لهذه اللغة' },
    ...voices.map((voice) => ({
      uri: voice.voiceURI,
      voice,
      name: voice.name,
      description: `${describeVoiceLanguage(voice.lang)}${voice.localService ? '' : ' · شبكي'}`,
    })),
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'tween', duration: 0.15 }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`اختيار صوت ${languageLabel}`}
            tabIndex={-1}
            className="fixed inset-x-3 top-1/2 z-[70] mx-auto max-w-md -translate-y-1/2 outline-none sm:inset-x-auto"
          >
            <Card className="flex max-h-[80vh] flex-col gap-3 p-4 shadow-elevated">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-text-primary">اختيار صوت {languageLabel}</h3>
                <IconButton aria-label="إغلاق" onClick={onClose} className="h-8 w-8">
                  <X size={16} aria-hidden="true" />
                </IconButton>
              </div>

              <ul className="flex flex-col gap-1.5 overflow-y-auto">
                {rows.map((row) => {
                  const isSelected = row.uri === selectedUri
                  const isPlaying = playingUri === row.uri
                  return (
                    <li
                      key={row.uri || 'auto'}
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors',
                        isSelected ? 'border-console bg-console/10' : 'border-transparent hover:bg-surface-elevated',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => togglePreview(row.voice, row.uri)}
                        aria-label={isPlaying ? `إيقاف معاينة ${row.name}` : `تجربة صوت ${row.name}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-elevated hover:text-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
                      >
                        {isPlaying ? <Square size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect(row.uri || null)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-sm px-1 py-1 text-start"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium text-text-primary">{row.name}</span>
                          <span className="truncate text-xs text-text-muted">{row.description}</span>
                        </span>
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                            isSelected ? 'border-console bg-console text-white' : 'border-border',
                          )}
                          aria-hidden="true"
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <span className="shrink-0 text-xs font-semibold text-text-secondary">سرعة النطق</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {SPEECH_RATES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleRateChange(option)}
                      aria-pressed={rate === option}
                      className={cn(
                        'rounded-sm px-1.5 py-1 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console',
                        rate === option
                          ? 'bg-console text-white'
                          : 'text-text-muted hover:bg-surface-elevated hover:text-text-primary',
                      )}
                    >
                      {option}×
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
