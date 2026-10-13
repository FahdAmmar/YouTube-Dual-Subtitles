import { STORAGE_KEYS } from '@/constants/theme.constants'

/** Word lookups send the word to third parties, so the user can switch them off. On by default. */
export function isOnlineLookupEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.ONLINE_LOOKUP) !== 'false'
  } catch {
    return true
  }
}
