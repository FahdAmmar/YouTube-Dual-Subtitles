import type { WordLookupResult } from './wordLookup'

/**
 * Remembers successful word lookups so a repeated word costs no network request
 * (MyMemory has a small daily quota). Deliberately not in STORAGE_KEYS: it is a
 * disposable cache, so it stays out of backups.
 */
const CACHE_KEY = 'ydc:lookup-cache'
export const MAX_CACHED_LOOKUPS = 200
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
/**
 * Bump when WordLookupResult gains data older entries lack. Entries of another version are ignored (and pruned in
 * time), so e.g. a German word looked up before articles existed is fetched again instead of staying without one.
 */
const CACHE_VERSION = 2

interface CacheEntry {
  at: number
  v?: number
  result: WordLookupResult
}
type CacheMap = Record<string, CacheEntry>

export function makeLookupCacheKey(word: string, learningLanguage: string, nativeLanguage?: string): string {
  return `${learningLanguage}|${nativeLanguage ?? ''}|${word.trim().toLowerCase()}`
}

function readCache(): CacheMap {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? '{}')
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as CacheMap) : {}
  } catch {
    return {}
  }
}

function writeCache(cache: CacheMap): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Quota or private mode: lookups still work, they just are not remembered
  }
}

export function getCachedLookup(key: string): WordLookupResult | null {
  const entry = readCache()[key]
  if (!entry || entry.v !== CACHE_VERSION || typeof entry.at !== 'number' || Date.now() - entry.at > MAX_AGE_MS) return null
  return entry.result ?? null
}

export function setCachedLookup(key: string, result: WordLookupResult): void {
  const cache = readCache()
  cache[key] = { at: Date.now(), v: CACHE_VERSION, result }

  const keysNewestFirst = Object.keys(cache).sort((a, b) => (cache[b]?.at ?? 0) - (cache[a]?.at ?? 0))
  for (const staleKey of keysNewestFirst.slice(MAX_CACHED_LOOKUPS)) delete cache[staleKey]

  writeCache(cache)
}

export function clearLookupCache(): void {
  try {
    window.localStorage.removeItem(CACHE_KEY)
  } catch {
    // Nothing to clear if storage is unavailable
  }
}
