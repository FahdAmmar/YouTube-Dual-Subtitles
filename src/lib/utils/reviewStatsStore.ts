import { STORAGE_KEYS } from '@/constants/theme.constants'
import { MAX_TRACKED_DAYS, toDayKey } from './learningStatsStore'

export { MIN_STREAK_REVIEWS } from './learningStatsStore'

/** Vocabulary reviews done per day. Kept apart from the watch-time map so that format, and old backups of it, stay untouched. */
export const DAILY_REVIEW_GOAL = 10

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_REVIEWS_PER_DAY = 10000

export type ReviewsByDay = ReadonlyMap<string, number>

/** Storage may hold anything (manual edits, restored backups), so only well-formed days survive */
export function getReviewCountsByDay(): ReviewsByDay {
  const result = new Map<string, number>()
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.REVIEW_STATS) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return result
    for (const [dayKey, count] of Object.entries(parsed)) {
      if (DAY_KEY_PATTERN.test(dayKey) && typeof count === 'number' && Number.isInteger(count) && count >= 0) {
        result.set(dayKey, Math.min(count, MAX_REVIEWS_PER_DAY))
      }
    }
  } catch {
    return new Map()
  }
  return result
}

export function addReview(now: Date = new Date()): void {
  const byDay = new Map(getReviewCountsByDay())
  const dayKey = toDayKey(now)
  byDay.set(dayKey, Math.min((byDay.get(dayKey) ?? 0) + 1, MAX_REVIEWS_PER_DAY))

  const newest = [...byDay].sort(([a], [b]) => b.localeCompare(a)).slice(0, MAX_TRACKED_DAYS)
  try {
    window.localStorage.setItem(STORAGE_KEYS.REVIEW_STATS, JSON.stringify(Object.fromEntries(newest)))
  } catch {
    // A full quota must never interrupt reviewing
  }
}
