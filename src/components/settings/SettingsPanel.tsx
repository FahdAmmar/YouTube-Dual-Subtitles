import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import { TrackStyleControl } from './FontSizeControl'
import { StorageUsagePanel } from './StorageUsagePanel'
import { VoiceSelector } from './VoiceSelector'
import { isSpeechSupported } from '@/lib/utils/textToSpeech'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { useSubtitleSettings } from '@/context/SubtitleSettingsContext'
import type { SubtitleTrackState } from '@/types/subtitle.types'

const MIN_SUBTITLE_WIDTH_PERCENT = 40
const MAX_SUBTITLE_WIDTH_PERCENT = 100
const MIN_SUBTITLE_LINE_HEIGHT = 1.1
const MAX_SUBTITLE_LINE_HEIGHT = 2

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  trackA: SubtitleTrackState
  trackB: SubtitleTrackState
}

/**
 * لوحة إعدادات منزلقة (Drawer) تحوي كل خيارات تخصيص عرض الترجمة
 * منفصلة في مكوّن مستقل ومحمّلة كسولاً (lazy) من App.tsx لتقليل حجم
 * الحزمة الأولية المحمّلة عند فتح التطبيق لأول مرة (تحسين الأداء)
 */
export function SettingsPanel({ isOpen, onClose, trackA, trackB }: SettingsPanelProps) {
  const { settings, updateTrackStyle, toggleBackdrop, setSubtitleWidthPercent, setSubtitleLineHeight, resetToDefaults } =
    useSubtitleSettings()
  const dialogRef = useDialogFocusTrap(isOpen, onClose)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            role="dialog"
            aria-modal="true"
            aria-label="إعدادات عرض الترجمة"
            tabIndex={-1}
            className="fixed inset-y-0 end-0 z-50 w-full max-w-sm p-3 outline-none"
          >
            <Card className="flex h-full flex-col gap-6 overflow-y-auto p-5 shadow-elevated">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary">إعدادات الترجمة</h2>
                <IconButton aria-label="إغلاق لوحة الإعدادات" onClick={onClose}>
                  <X size={19} aria-hidden="true" />
                </IconButton>
              </div>

              <TrackStyleControl
                trackTitle={trackA.languageLabel}
                accentClassName="border-track-a"
                style={settings.trackA}
                onChange={(patch) => updateTrackStyle('trackA', patch)}
              />

              <TrackStyleControl
                trackTitle={trackB.languageLabel}
                accentClassName="border-track-b"
                style={settings.trackB}
                onChange={(patch) => updateTrackStyle('trackB', patch)}
              />

              {isSpeechSupported() && (
                <>
                  <VoiceSelector key={trackB.languageCode} languageCode={trackB.languageCode} languageLabel={trackB.languageLabel} />
                  {trackA.languageCode !== trackB.languageCode && (
                    <VoiceSelector key={trackA.languageCode} languageCode={trackA.languageCode} languageLabel={trackA.languageLabel} />
                  )}
                </>
              )}

              <div className="flex flex-col gap-4 border-s-4 border-border ps-4">
                <h3 className="text-sm font-semibold text-text-primary">صندوق الترجمة</h3>

                <Slider
                  id="subtitle-width"
                  label="عرض الصندوق"
                  valueLabel={`${Math.round(settings.subtitleWidthPercent)}%`}
                  min={MIN_SUBTITLE_WIDTH_PERCENT}
                  max={MAX_SUBTITLE_WIDTH_PERCENT}
                  step={2}
                  value={settings.subtitleWidthPercent}
                  onChange={(event) => setSubtitleWidthPercent(Number(event.target.value))}
                />

                <Slider
                  id="subtitle-line-height"
                  label="تباعد الأسطر"
                  valueLabel={settings.subtitleLineHeight.toFixed(2)}
                  min={MIN_SUBTITLE_LINE_HEIGHT}
                  max={MAX_SUBTITLE_LINE_HEIGHT}
                  step={0.05}
                  value={settings.subtitleLineHeight}
                  onChange={(event) => setSubtitleLineHeight(Number(event.target.value))}
                />
              </div>

              <label className="flex items-center justify-between text-sm font-medium text-text-secondary">
                خلفية داكنة خلف النص
                <input
                  type="checkbox"
                  checked={settings.showBackdrop}
                  onChange={toggleBackdrop}
                  className="h-5 w-5 accent-console"
                />
              </label>

              <Button variant="secondary" size="sm" onClick={resetToDefaults} className="mt-auto">
                <RotateCcw size={15} aria-hidden="true" />
                استعادة الإعدادات الافتراضية
              </Button>

              <StorageUsagePanel isOpen={isOpen} />
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
