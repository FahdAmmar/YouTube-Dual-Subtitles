import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { TrackStyleControl } from './FontSizeControl'
import { useSubtitleSettings } from '@/context/SubtitleSettingsContext'
import type { SubtitleTrackState } from '@/types/subtitle.types'

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
  const { settings, updateTrackStyle, toggleBackdrop, resetToDefaults } = useSubtitleSettings()

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
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            role="dialog"
            aria-label="إعدادات عرض الترجمة"
            className="fixed inset-y-0 end-0 z-50 w-full max-w-sm p-3"
          >
            <Card className="flex h-full flex-col gap-6 overflow-y-auto p-5">
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
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
