import { STORAGE_KEYS } from '@/constants/theme.constants'

/** A day counts toward the streak after this much watching */
export const MIN_STREAK_SECONDS = 60
export const MAX_TRACKED_DAYS = 400

const SECONDS_PER_DAY = 86400
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

type SecondsByDay = ReadonlyMap<string, number>

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Local calendar day, not UTC: a streak follows the learner's own midnight */
export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function shiftDays(date: Date, offset: number): Date {
  // Building from parts keeps the result on the right local day across DST changes
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset, 12)
}

/** Storage may hold anything (manual edits, restored backups), so only well-formed days survive */
export function getWatchSecondsByDay(): SecondsByDay {
  const result = new Map<string, number>()
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.LEARNING_STATS) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return result
    for (const [dayKey, seconds] of Object.entries(parsed)) {
      if (DAY_KEY_PATTERN.test(dayKey) && typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0) {
        result.set(dayKey, Math.min(seconds, SECONDS_PER_DAY))
      }
    }
  } catch {
    return new Map()
  }
  return result
}

export function addWatchSeconds(seconds: number, now: Date = new Date()): void {
  if (!Number.isFinite(seconds) || seconds <= 0) return

  const byDay = new Map(getWatchSecondsByDay())
  const dayKey = toDayKey(now)
  byDay.set(dayKey, Math.min((byDay.get(dayKey) ?? 0) + seconds, SECONDS_PER_DAY))

  const newest = [...byDay].sort(([a], [b]) => b.localeCompare(a)).slice(0, MAX_TRACKED_DAYS)
  try {
    window.localStorage.setItem(STORAGE_KEYS.LEARNING_STATS, JSON.stringify(Object.fromEntries(newest)))
  } catch {
    // A full quota must never interrupt playback
  }
}

function qualifies(byDay: SecondsByDay, date: Date): boolean {
  return (byDay.get(toDayKey(date)) ?? 0) >= MIN_STREAK_SECONDS
}

/** Consecutive qualifying days. Today may still be empty: the streak stays alive until the day ends */
export function computeStreak(byDay: SecondsByDay, today: Date): number {
  let cursor = qualifies(byDay, today) ? today : shiftDays(today, -1)
  let streak = 0
  while (qualifies(byDay, cursor)) {
    streak += 1
    cursor = shiftDays(cursor, -1)
  }
  return streak
}

export interface DayStat {
  dayKey: string
  date: Date
  seconds: number
}

/** The last `count` days ending today, oldest first, with zeros for days not watched */
export function getLastDays(byDay: SecondsByDay, today: Date, count: number): DayStat[] {
  return Array.from({ length: count }, (_, index) => {
    const date = shiftDays(today, index - (count - 1))
    const dayKey = toDayKey(date)
    return { dayKey, date, seconds: byDay.get(dayKey) ?? 0 }
  })
}
