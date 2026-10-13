import type { GlossaryEntry, GlossaryReview, ReviewGrade } from '@/types/glossary.types'

export const MINUTE_MS = 60 * 1000
export const DAY_MS = 24 * 60 * MINUTE_MS

/**
 * Leitner system: the better a word is known, the longer the wait before it returns.
 * Index = box. Box 0 is only used for new or forgotten words.
 */
const BOX_WAIT_DAYS = [0, 1, 3, 7, 14, 30] as const
const LAST_BOX = BOX_WAIT_DAYS.length - 1
const FORGOTTEN_RETRY_MS = 10 * MINUTE_MS
const BOXES_GAINED: Record<Exclude<ReviewGrade, 'again'>, number> = { good: 1, easy: 2 }

/** Stored data can be old or hand-edited (backups), so a malformed review counts as "never reviewed" */
function getValidReview(entry: GlossaryEntry): GlossaryReview | null {
  const review: unknown = entry.review
  if (typeof review !== 'object' || review === null) return null
  const { box, dueAt, lastReviewedAt } = review as Record<string, unknown>
  if (typeof box !== 'number' || !Number.isInteger(box) || box < 0 || box > LAST_BOX) return null
  if (typeof dueAt !== 'number' || !Number.isFinite(dueAt)) return null
  if (typeof lastReviewedAt !== 'number' || !Number.isFinite(lastReviewedAt)) return null
  return { box, dueAt, lastReviewedAt }
}

export function isDue(entry: GlossaryEntry, now: number): boolean {
  const review = getValidReview(entry)
  return review === null || review.dueAt <= now
}

function getNextBox(entry: GlossaryEntry, grade: ReviewGrade): number {
  if (grade === 'again') return 0
  const currentBox = getValidReview(entry)?.box ?? 0
  return Math.min(LAST_BOX, currentBox + BOXES_GAINED[grade])
}

/** Returns an updated copy; the original entry is left untouched */
export function applyGrade(entry: GlossaryEntry, grade: ReviewGrade, now: number): GlossaryEntry {
  const box = getNextBox(entry, grade)
  const waitMs = grade === 'again' ? FORGOTTEN_RETRY_MS : BOX_WAIT_DAYS[box]! * DAY_MS
  return { ...entry, review: { box, dueAt: now + waitMs, lastReviewedAt: now } }
}

/** Overdue words first (most overdue first), then new words in the order they were added */
export function getDueEntries(entries: GlossaryEntry[], now: number): GlossaryEntry[] {
  const due = entries.filter((entry) => isDue(entry, now))
  const reviewed = due
    .filter((entry) => getValidReview(entry) !== null)
    .sort((a, b) => getValidReview(a)!.dueAt - getValidReview(b)!.dueAt)
  const fresh = due.filter((entry) => getValidReview(entry) === null).sort((a, b) => a.addedAt - b.addedAt)
  return [...reviewed, ...fresh]
}

/** How long the word will stay away if this answer is chosen, for the answer buttons */
export function getIntervalLabel(entry: GlossaryEntry, grade: ReviewGrade): string {
  if (grade === 'again') return '10 دقائق'
  const days = BOX_WAIT_DAYS[getNextBox(entry, grade)]!
  if (days === 1) return 'يوم'
  return days <= 10 ? `${days} أيام` : `${days} يوماً`
}
