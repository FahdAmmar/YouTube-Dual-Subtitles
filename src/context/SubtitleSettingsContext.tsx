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
  setSubtitleWidthPercent: (value: number) => void
  setSubtitleLineHeight: (value: number) => void
  resetToDefaults: () => void
}

const SubtitleSettingsContext = createContext<SubtitleSettingsContextValue | null>(null)

/**
 * يُكمِّل أي حقول ناقصة بالقيم الافتراضية قبل القراءة أو الكتابة —
 * ضروري لأن مستخدمين حاليين لديهم بالفعل كائن محفوظ في localStorage من
 * قبل إضافة subtitleWidthPercent/subtitleLineHeight (ومستقبلاً أي حقل
 * جديد آخر)؛ بدون هذا الإكمال، settings.subtitleWidthPercent سيكون
 * undefined لكل مستخدم قديم تحديداً، لا للمستخدمين الجدد فقط
 */
function withDefaults(value: SubtitleDisplaySettings): SubtitleDisplaySettings {
  return {
    ...DEFAULT_SUBTITLE_SETTINGS,
    ...value,
    trackA: { ...DEFAULT_SUBTITLE_SETTINGS.trackA, ...value.trackA },
    trackB: { ...DEFAULT_SUBTITLE_SETTINGS.trackB, ...value.trackB },
  }
}

/**
 * موفّر إعدادات عرض الترجمة: يحفظ تفضيلات حجم/لون الخط لكل مسار في
 * التخزين المحلي تلقائياً، ليجدها المستخدم كما تركها في زيارته التالية
 */
export function SubtitleSettingsProvider({ children }: { children: ReactNode }) {
  const [storedSettings, setSettings] = useLocalStorage<SubtitleDisplaySettings>(
    STORAGE_KEYS.SUBTITLE_SETTINGS,
    DEFAULT_SUBTITLE_SETTINGS,
  )
  const settings = withDefaults(storedSettings)

  const updateTrackStyle = useCallback(
    (track: SubtitleTrackId, patch: Partial<SubtitleStyleSettings>) => {
      setSettings((previous) => {
        const complete = withDefaults(previous)
        return { ...complete, [track]: { ...complete[track], ...patch } }
      })
    },
    [setSettings],
  )

  const toggleBackdrop = useCallback(() => {
    setSettings((previous) => {
      const complete = withDefaults(previous)
      return { ...complete, showBackdrop: !complete.showBackdrop }
    })
  }, [setSettings])

  const setSubtitleWidthPercent = useCallback(
    (value: number) => {
      setSettings((previous) => ({ ...withDefaults(previous), subtitleWidthPercent: value }))
    },
    [setSettings],
  )

  const setSubtitleLineHeight = useCallback(
    (value: number) => {
      setSettings((previous) => ({ ...withDefaults(previous), subtitleLineHeight: value }))
    },
    [setSettings],
  )

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SUBTITLE_SETTINGS)
  }, [setSettings])

  return (
    <SubtitleSettingsContext.Provider
      value={{
        settings,
        updateTrackStyle,
        toggleBackdrop,
        setSubtitleWidthPercent,
        setSubtitleLineHeight,
        resetToDefaults,
      }}
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
