import { beforeEach, describe, it, expect } from 'vitest'
import { addReview, getReviewCountsByDay, DAILY_REVIEW_GOAL, MIN_STREAK_REVIEWS } from './reviewStatsStore'
import { computeStreak, toDayKey } from './learningStatsStore'
import { getLearningSummary } from './learningSummary'
import { STORAGE_KEYS } from '@/constants/theme.constants'

const TODAY = new Date(2026, 9, 5, 12)
const daysAgo = (days: number) => new Date(2026, 9, 5 - days, 12)

beforeEach(() => window.localStorage.clear())

describe('review counts', () => {
  it('counts reviews per local day', () => {
    addReview(TODAY)
    addReview(TODAY)
    addReview(daysAgo(1))
    expect(getReviewCountsByDay().get(toDayKey(TODAY))).toBe(2)
    expect(getReviewCountsByDay().get(toDayKey(daysAgo(1)))).toBe(1)
  })

  it('ignores malformed stored data instead of crashing', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.REVIEW_STATS,
      JSON.stringify({ '2026-10-05': 3, 'not-a-day': 9, '2026-10-04': -2, '2026-10-03': 'x' }),
    )
    expect([...getReviewCountsByDay()]).toEqual([['2026-10-05', 3]])
    window.localStorage.setItem(STORAGE_KEYS.REVIEW_STATS, '{broken')
    expect(getReviewCountsByDay().size).toBe(0)
  })
})

describe('streak with reviews', () => {
  const noWatching = new Map<string, number>()

  it('counts a day with enough reviews even if nothing was watched', () => {
    const reviews = new Map([[toDayKey(TODAY), MIN_STREAK_REVIEWS]])
    expect(computeStreak(noWatching, TODAY, reviews)).toBe(1)
  })

  it('does not count a day with only a couple of reviews', () => {
    const reviews = new Map([[toDayKey(TODAY), MIN_STREAK_REVIEWS - 1]])
    expect(computeStreak(noWatching, TODAY, reviews)).toBe(0)
  })

  it('chains watching days and reviewing days together', () => {
    const watching = new Map([[toDayKey(daysAgo(1)), 120]])
    const reviews = new Map([[toDayKey(TODAY), MIN_STREAK_REVIEWS], [toDayKey(daysAgo(2)), MIN_STREAK_REVIEWS]])
    expect(computeStreak(watching, TODAY, reviews)).toBe(3)
  })

  it('still works without review data, as before', () => {
    expect(computeStreak(new Map([[toDayKey(TODAY), 90]]), TODAY)).toBe(1)
  })
})

describe('learning summary', () => {
  it('reports today reviews against the daily goal and counts review-only users as having data', () => {
    for (let index = 0; index < 3; index += 1) addReview(TODAY)
    const summary = getLearningSummary(TODAY)
    expect(summary.reviewsToday).toBe(3)
    expect(summary.reviewGoal).toBe(DAILY_REVIEW_GOAL)
    expect(summary.hasData).toBe(true)
  })
})
