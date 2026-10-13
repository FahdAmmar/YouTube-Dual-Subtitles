import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest'
import { clearLookupCache, getCachedLookup, makeLookupCacheKey, setCachedLookup, MAX_CACHED_LOOKUPS } from './lookupCache'
import type { WordLookupResult } from './wordLookup'

const result = (word: string): WordLookupResult => ({ word, translation: `t-${word}`, alternatives: [], meanings: [] })

beforeEach(() => {
  window.localStorage.clear()
  vi.useRealTimers()
})
afterEach(() => vi.useRealTimers())

describe('lookupCache', () => {
  it('returns what was stored, ignoring letter case of the word', () => {
    setCachedLookup(makeLookupCacheKey('Haus', 'de', 'ar'), result('Haus'))
    expect(getCachedLookup(makeLookupCacheKey('haus', 'de', 'ar'))?.translation).toBe('t-Haus')
  })

  it('keeps different language pairs apart', () => {
    setCachedLookup(makeLookupCacheKey('chat', 'fr', 'ar'), result('chat'))
    expect(getCachedLookup(makeLookupCacheKey('chat', 'fr', 'en'))).toBeNull()
  })

  it('forgets entries older than the time limit', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01'))
    setCachedLookup(makeLookupCacheKey('Haus', 'de', 'ar'), result('Haus'))
    vi.setSystemTime(new Date('2026-03-01'))
    expect(getCachedLookup(makeLookupCacheKey('Haus', 'de', 'ar'))).toBeNull()
  })

  it('drops the oldest entries beyond the size limit', () => {
    vi.useFakeTimers()
    for (let index = 0; index < MAX_CACHED_LOOKUPS + 5; index += 1) {
      vi.setSystemTime(new Date(2026, 0, 1, 0, 0, index))
      setCachedLookup(makeLookupCacheKey(`w${index}`, 'de'), result(`w${index}`))
    }
    expect(getCachedLookup(makeLookupCacheKey('w0', 'de'))).toBeNull()
    expect(getCachedLookup(makeLookupCacheKey(`w${MAX_CACHED_LOOKUPS + 4}`, 'de'))).not.toBeNull()
  })

  it('survives corrupted storage', () => {
    window.localStorage.setItem('ydc:lookup-cache', '{not json')
    expect(getCachedLookup(makeLookupCacheKey('Haus', 'de'))).toBeNull()
    expect(() => setCachedLookup(makeLookupCacheKey('Haus', 'de'), result('Haus'))).not.toThrow()
    expect(getCachedLookup(makeLookupCacheKey('Haus', 'de'))).not.toBeNull()
  })

  it('can be cleared', () => {
    setCachedLookup(makeLookupCacheKey('Haus', 'de'), result('Haus'))
    clearLookupCache()
    expect(getCachedLookup(makeLookupCacheKey('Haus', 'de'))).toBeNull()
  })
})
