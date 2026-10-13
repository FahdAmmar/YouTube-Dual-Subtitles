import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import { DEFAULT_READING_PREFS, sanitizeReadingPrefs, type ReadingPrefs } from '@/lib/utils/readingPrefs'

export function useReadingPrefs(): [ReadingPrefs, (patch: Partial<ReadingPrefs>) => void] {
  const [stored, setStored] = useLocalStorage<unknown>(STORAGE_KEYS.READING_PREFS, DEFAULT_READING_PREFS)
  const prefs = useMemo(() => sanitizeReadingPrefs(stored), [stored])
  const update = useCallback(
    (patch: Partial<ReadingPrefs>) => setStored((previous: unknown) => ({ ...sanitizeReadingPrefs(previous), ...patch })),
    [setStored],
  )
  return [prefs, update]
}
