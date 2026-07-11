import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { STORAGE_KEYS, DEFAULT_SUBTITLE_SETTINGS } from '@/constants/theme.constants'
import type {
  SubtitleDisplaySettings,
  SubtitleStyleSettings,
} from '@/types/theme.types'
import type { SubtitleTrackId } from '@/types/subtitle.types'

interface SubtitleSettingsContextValue {
  settings: SubtitleDisplaySettings
  updateTrackStyle: (track: SubtitleTrackId, patch: Partial<SubtitleStyleSettings>) => void
  toggleBackdrop: () => void
  resetToDefaults: () => void
}

const SubtitleSettingsContext = createContext<SubtitleSettingsContextValue | null>(null)

/**
 * موفّر إعدادات عرض الترجمة: يحفظ تفضيلات حجم/لون الخط لكل مسار في
 * التخزين المحلي تلقائياً، ليجدها المستخدم كما تركها في زيارته التالية
 */
export function SubtitleSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useLocalStorage<SubtitleDisplaySettings>(
    STORAGE_KEYS.SUBTITLE_SETTINGS,
    DEFAULT_SUBTITLE_SETTINGS,
  )

  const updateTrackStyle = useCallback(
    (track: SubtitleTrackId, patch: Partial<SubtitleStyleSettings>) => {
      setSettings((previous) => ({
        ...previous,
        [track]: { ...previous[track], ...patch },
      }))
    },
    [setSettings],
  )

  const toggleBackdrop = useCallback(() => {
    setSettings((previous) => ({ ...previous, showBackdrop: !previous.showBackdrop }))
  }, [setSettings])

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SUBTITLE_SETTINGS)
  }, [setSettings])

  return (
    <SubtitleSettingsContext.Provider
      value={{ settings, updateTrackStyle, toggleBackdrop, resetToDefaults }}
    >
      {children}
    </SubtitleSettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- تصميم مقصود: تجميع الموفّر والـ Hook الخاص به في ملف واحد هو نمط شائع ومقبول لسياقات React (Context)
export function useSubtitleSettings(): SubtitleSettingsContextValue {
  const context = useContext(SubtitleSettingsContext)
  if (!context) {
    throw new Error('useSubtitleSettings يجب أن يُستخدم داخل SubtitleSettingsProvider')
  }
  return context
}
