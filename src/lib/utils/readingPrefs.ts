export const READING_FONT_SCALES = [0.85, 1, 1.15, 1.3, 1.5] as const

export interface ReadingPrefs {
  /** Index into READING_FONT_SCALES */
  fontScaleIndex: number
  /** Show the translation first and large instead of the source */
  isSwapped: boolean
  showTimestamps: boolean
}

export const DEFAULT_READING_PREFS: ReadingPrefs = {
  fontScaleIndex: 1,
  isSwapped: false,
  showTimestamps: true,
}

/** Stored values may be missing, old or restored from a backup file, so nothing is trusted */
export function sanitizeReadingPrefs(value: unknown): ReadingPrefs {
  if (typeof value !== 'object' || value === null) return DEFAULT_READING_PREFS
  const raw = value as Record<string, unknown>
  const index = raw.fontScaleIndex
  return {
    fontScaleIndex:
      typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < READING_FONT_SCALES.length
        ? index
        : DEFAULT_READING_PREFS.fontScaleIndex,
    isSwapped: typeof raw.isSwapped === 'boolean' ? raw.isSwapped : DEFAULT_READING_PREFS.isSwapped,
    showTimestamps:
      typeof raw.showTimestamps === 'boolean' ? raw.showTimestamps : DEFAULT_READING_PREFS.showTimestamps,
  }
}
