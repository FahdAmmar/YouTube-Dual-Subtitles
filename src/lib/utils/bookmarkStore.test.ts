import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import { makeBookmarkId, getBookmarkIds, toggleBookmarkId, countBookmarks, MAX_BOOKMARKS } from './bookmarkStore'

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.restoreAllMocks())

const slice = (overrides = {}) => ({ originalIndex: 3, sourceText: 'Guten Morgen', translationText: 'صباح الخير', ...overrides })

describe('makeBookmarkId', () => {
  it('is stable for the same segment and ignores timing (sync offsets never change it)', () => {
    expect(makeBookmarkId({ ...slice(), start: 1 } as never)).toBe(makeBookmarkId({ ...slice(), start: 99 } as never))
  })

  it('differs when the position or the text differs, so a different subtitle file never matches', () => {
    const base = makeBookmarkId(slice())
    expect(makeBookmarkId(slice({ originalIndex: 4 }))).not.toBe(base)
    expect(makeBookmarkId(slice({ sourceText: 'Guten Abend' }))).not.toBe(base)
  })

  it('falls back to the translation text when the segment has no source text', () => {
    const id = makeBookmarkId(slice({ sourceText: null }))
    expect(id).not.toBe(makeBookmarkId(slice({ sourceText: null, translationText: 'مساء الخير' })))
  })

  it('ignores case and surrounding whitespace in the text', () => {
    expect(makeBookmarkId(slice({ sourceText: '  guten MORGEN ' }))).toBe(makeBookmarkId(slice()))
  })
})

describe('bookmark storage', () => {
  it('toggles a bookmark on and off, reporting the new state', () => {
    expect(toggleBookmarkId('youtube:a', 'x')).toBe(true)
    expect(getBookmarkIds('youtube:a').has('x')).toBe(true)
    expect(toggleBookmarkId('youtube:a', 'x')).toBe(false)
    expect(getBookmarkIds('youtube:a').has('x')).toBe(false)
  })

  it('keeps bookmarks separate per video', () => {
    toggleBookmarkId('youtube:a', 'x')
    expect(getBookmarkIds('youtube:b').size).toBe(0)
  })

  it('keeps only the newest bookmarks once the global cap is exceeded', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1)
    toggleBookmarkId('youtube:a', 'oldest')
    for (let i = 0; i < MAX_BOOKMARKS; i++) {
      vi.spyOn(Date, 'now').mockReturnValue(2 + i)
      toggleBookmarkId('youtube:b', `id${i}`)
    }
    expect(getBookmarkIds('youtube:a').has('oldest')).toBe(false)
    expect(getBookmarkIds('youtube:b').size).toBe(MAX_BOOKMARKS)
  })

  it.each([
    ['invalid JSON', '{nope'],
    ['a non-object', '[1,2]'],
    ['a video entry that is not an object', '{"youtube:a": 5}'],
    ['timestamps that are not numbers', '{"youtube:a": {"x": "yesterday"}}'],
  ])('treats %s in storage as no bookmarks', (_label, raw) => {
    window.localStorage.setItem(STORAGE_KEYS.BOOKMARKS, raw)
    expect(getBookmarkIds('youtube:a').size).toBe(0)
    expect(() => toggleBookmarkId('youtube:a', 'x')).not.toThrow()
  })

  it('still reports the new state when storage rejects the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(() => toggleBookmarkId('youtube:a', 'x')).not.toThrow()
  })
})

describe('countBookmarks', () => {
  it('counts bookmarks across all videos', () => {
    expect(countBookmarks()).toBe(0)
    toggleBookmarkId('youtube:a', 'x')
    toggleBookmarkId('youtube:a', 'y')
    toggleBookmarkId('youtube:b', 'z')
    expect(countBookmarks()).toBe(3)
    toggleBookmarkId('youtube:a', 'x')
    expect(countBookmarks()).toBe(2)
  })
})
