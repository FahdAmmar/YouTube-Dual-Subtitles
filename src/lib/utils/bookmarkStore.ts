import { STORAGE_KEYS } from '@/constants/theme.constants'
import type { PairedSlice } from '@/lib/subtitles/pairCues'

/** Global cap across all videos; the oldest bookmarks are dropped first, like the glossary */
export const MAX_BOOKMARKS = 1000

// videoKey -> bookmark id -> time added. Maps (not plain objects) so restored keys like "__proto__" stay inert data
type BookmarkMap = Map<string, Map<string, number>>

function hashText(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

/**
 * Identity of a segment across sessions. Timing is left out on purpose (it moves with
 * sync offsets); position plus a text hash means a different subtitle file never matches.
 */
export function makeBookmarkId(slice: Pick<PairedSlice, 'originalIndex' | 'sourceText' | 'translationText'>): string {
  const text = (slice.sourceText ?? slice.translationText ?? '').trim().toLowerCase()
  return `${slice.originalIndex}:${hashText(text)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Storage may hold anything (manual edits, restored backups), so only well-formed entries survive */
function readBookmarks(): BookmarkMap {
  const result: BookmarkMap = new Map()
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.BOOKMARKS) ?? 'null')
    if (!isRecord(parsed)) return result
    for (const [videoKey, entries] of Object.entries(parsed)) {
      if (!isRecord(entries)) continue
      const ids = new Map<string, number>()
      for (const [id, addedAt] of Object.entries(entries)) {
        if (typeof addedAt === 'number' && Number.isFinite(addedAt)) ids.set(id, addedAt)
      }
      if (ids.size > 0) result.set(videoKey, ids)
    }
  } catch {
    return new Map()
  }
  return result
}

function writeBookmarks(map: BookmarkMap): void {
  const newestFirst = [...map]
    .flatMap(([videoKey, ids]) => [...ids].map(([id, addedAt]) => ({ videoKey, id, addedAt })))
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, MAX_BOOKMARKS)

  const pruned = new Map<string, Map<string, number>>()
  for (const { videoKey, id, addedAt } of newestFirst) {
    pruned.set(videoKey, (pruned.get(videoKey) ?? new Map()).set(id, addedAt))
  }

  try {
    const serializable = Object.fromEntries([...pruned].map(([videoKey, ids]) => [videoKey, Object.fromEntries(ids)]))
    window.localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(serializable))
  } catch {
    // Same policy as the other stores: a full quota must not break playback
  }
}

export function getBookmarkIds(videoKey: string): Set<string> {
  return new Set(readBookmarks().get(videoKey)?.keys())
}

/** Returns true when the bookmark was added, false when it was removed */
export function toggleBookmarkId(videoKey: string, id: string): boolean {
  const map = readBookmarks()
  const ids = map.get(videoKey) ?? new Map<string, number>()
  const added = !ids.has(id)
  if (added) ids.set(id, Date.now())
  else ids.delete(id)

  if (ids.size > 0) map.set(videoKey, ids)
  else map.delete(videoKey)
  writeBookmarks(map)
  return added
}

export function countBookmarks(): number {
  let total = 0
  for (const ids of readBookmarks().values()) total += ids.size
  return total
}
