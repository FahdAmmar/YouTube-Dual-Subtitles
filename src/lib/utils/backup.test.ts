import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { resetIndexedDb } from '@/__tests__/testHelpers/resetIndexedDb'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import { saveSubtitleContent, getSubtitleContent } from './subtitleContentStore'
import { createBackup, parseBackup, applyBackup, BackupError, BACKUP_FORMAT, BACKUP_VERSION } from './backup'

beforeEach(() => {
  window.localStorage.clear()
  resetIndexedDb()
})
afterEach(() => vi.restoreAllMocks())

function validBackup(overrides: Record<string, unknown> = {}) {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: 1, local: {}, subtitles: [], ...overrides }
}
const parse = (value: unknown) => parseBackup(JSON.stringify(value))

describe('createBackup', () => {
  it('includes only this app\'s storage keys, never foreign ones', async () => {
    window.localStorage.setItem(STORAGE_KEYS.GLOSSARY, '{"a":1}')
    window.localStorage.setItem('other-site:token', 'secret')
    const backup = await createBackup()
    expect(backup.local).toEqual({ [STORAGE_KEYS.GLOSSARY]: '{"a":1}' })
  })

  it('includes bookmarked sentences', async () => {
    window.localStorage.setItem(STORAGE_KEYS.BOOKMARKS, '{"youtube:a":{"1:abc":5}}')
    const backup = await createBackup()
    expect(backup.local[STORAGE_KEYS.BOOKMARKS]).toBe('{"youtube:a":{"1:abc":5}}')
  })

  it('includes saved subtitle file contents', async () => {
    await saveSubtitleContent('youtube:abc', 'source', 'ar.srt', 'CONTENT')
    const backup = await createBackup()
    expect(backup.subtitles).toHaveLength(1)
    expect(backup.subtitles[0]).toMatchObject({ key: 'youtube:abc::source::ar.srt', content: 'CONTENT' })
  })
})

describe('parseBackup', () => {
  it('accepts what createBackup produces', async () => {
    window.localStorage.setItem(STORAGE_KEYS.THEME, '"dark"')
    await saveSubtitleContent('youtube:abc', 'source', 'ar.srt', 'CONTENT')
    const backup = await createBackup()
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup)
  })

  it.each([
    ['text that is not JSON', 'not json {'],
    ['JSON that is not an object', '[]'],
    ['a foreign file format', JSON.stringify(validBackup({ format: 'something-else' }))],
    ['a newer unsupported version', JSON.stringify(validBackup({ version: 99 }))],
    ['non-string storage values', JSON.stringify(validBackup({ local: { [STORAGE_KEYS.THEME]: { a: 1 } } }))],
    ['a subtitle entry with a missing field', JSON.stringify(validBackup({ subtitles: [{ key: 'k', content: 'c' }] }))],
    ['an oversized subtitle file', JSON.stringify(validBackup({ subtitles: [{ key: 'k', content: 'x'.repeat(2 * 1024 * 1024 + 1), savedAt: 1 }] }))],
    ['too many subtitle files', JSON.stringify(validBackup({ subtitles: Array.from({ length: 31 }, (_, i) => ({ key: `k${i}`, content: 'c', savedAt: i })) }))],
  ])('rejects %s', (_label, text) => {
    expect(() => parseBackup(text)).toThrow(BackupError)
  })

  it('drops unknown and prototype-polluting keys instead of importing them', () => {
    const text = `{"format":"${BACKUP_FORMAT}","version":${BACKUP_VERSION},"createdAt":1,"subtitles":[],"local":{"__proto__":"x","evil:key":"y","${STORAGE_KEYS.THEME}":"\\"dark\\""}}`
    const backup = parseBackup(text)
    expect(backup.local).toEqual({ [STORAGE_KEYS.THEME]: '"dark"' })
    expect(({} as Record<string, unknown>).x).toBeUndefined()
  })
})

describe('applyBackup', () => {
  it('restores storage keys and subtitle contents', async () => {
    const backup = parse(
      validBackup({
        local: { [STORAGE_KEYS.GLOSSARY]: '{"a":1}' },
        subtitles: [{ key: 'youtube:abc::source::ar.srt', content: 'RESTORED', savedAt: 5 }],
      }),
    )
    await applyBackup(backup)
    expect(window.localStorage.getItem(STORAGE_KEYS.GLOSSARY)).toBe('{"a":1}')
    expect(await getSubtitleContent('youtube:abc', 'source', 'ar.srt')).toBe('RESTORED')
  })

  it('rolls storage back to its previous state when a write fails midway', async () => {
    window.localStorage.setItem(STORAGE_KEYS.THEME, '"light"')
    const backup = parse(validBackup({ local: { [STORAGE_KEYS.THEME]: '"dark"', [STORAGE_KEYS.GLOSSARY]: '{}' } }))

    const realSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === STORAGE_KEYS.GLOSSARY) throw new DOMException('full', 'QuotaExceededError')
      realSetItem.call(this, key, value)
    })

    await expect(applyBackup(backup)).rejects.toThrow(BackupError)
    vi.restoreAllMocks()
    expect(window.localStorage.getItem(STORAGE_KEYS.THEME)).toBe('"light"')
    expect(window.localStorage.getItem(STORAGE_KEYS.GLOSSARY)).toBeNull()
  })
})
