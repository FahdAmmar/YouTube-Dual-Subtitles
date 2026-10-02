import { countBookmarks } from './bookmarkStore'
import { getGlossaryEntries } from './glossaryStore'
import { computeStreak, getLastDays, getWatchSecondsByDay, type DayStat } from './learningStatsStore'

export const CHART_DAYS = 7

export interface LearningSummary {
  streak: number
  /** Seconds watched over the last CHART_DAYS days, today included */
  weekSeconds: number
  days: DayStat[]
  wordCount: number
  bookmarkCount: number
  /** False for a brand new learner, so the home screen can stay uncluttered */
  hasData: boolean
}

export function getLearningSummary(today: Date = new Date()): LearningSummary {
  const byDay = getWatchSecondsByDay()
  const days = getLastDays(byDay, today, CHART_DAYS)
  const weekSeconds = days.reduce((sum, day) => sum + day.seconds, 0)
  const wordCount = getGlossaryEntries().length
  const bookmarkCount = countBookmarks()

  return {
    streak: computeStreak(byDay, today),
    weekSeconds,
    days,
    wordCount,
    bookmarkCount,
    hasData: byDay.size > 0 || wordCount > 0 || bookmarkCount > 0,
  }
}
