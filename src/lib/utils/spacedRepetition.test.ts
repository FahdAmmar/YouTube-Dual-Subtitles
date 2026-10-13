import { describe, it, expect } from 'vitest'
import { applyGrade, getDueEntries, getIntervalLabel, isDue, MINUTE_MS, DAY_MS } from './spacedRepetition'
import type { GlossaryEntry } from '@/types/glossary.types'

const NOW = new Date('2026-10-05T10:00:00Z').getTime()

const entry = (id: string, patch: Partial<GlossaryEntry> = {}): GlossaryEntry => ({
  id,
  word: id,
  languageCode: 'de',
  partOfSpeech: '',
  definition: '',
  example: null,
  addedAt: NOW - 1000,
  ...patch,
})

describe('isDue', () => {
  it('treats a never-reviewed word as due', () => {
    expect(isDue(entry('a'), NOW)).toBe(true)
  })

  it('is due only once its time has come', () => {
    const review = { box: 2, lastReviewedAt: NOW - DAY_MS }
    expect(isDue(entry('a', { review: { ...review, dueAt: NOW + 1 } }), NOW)).toBe(false)
    expect(isDue(entry('a', { review: { ...review, dueAt: NOW } }), NOW)).toBe(true)
  })

  it('treats corrupted review data as never reviewed instead of crashing', () => {
    const broken = entry('a', { review: { box: 'x', dueAt: null } as never })
    expect(isDue(broken, NOW)).toBe(true)
  })
})

describe('applyGrade', () => {
  it('sends a forgotten word back to the start, to return in ten minutes', () => {
    const learned = entry('a', { review: { box: 4, dueAt: NOW, lastReviewedAt: NOW } })
    const result = applyGrade(learned, 'again', NOW)
    expect(result.review).toEqual({ box: 0, dueAt: NOW + 10 * MINUTE_MS, lastReviewedAt: NOW })
  })

  it('moves a remembered word one box up with a longer wait', () => {
    const first = applyGrade(entry('a'), 'good', NOW)
    expect(first.review?.box).toBe(1)
    expect(first.review?.dueAt).toBe(NOW + 1 * DAY_MS)

    const second = applyGrade(first, 'good', NOW)
    expect(second.review?.box).toBe(2)
    expect(second.review?.dueAt).toBe(NOW + 3 * DAY_MS)
  })

  it('moves an easy word two boxes up', () => {
    expect(applyGrade(entry('a'), 'easy', NOW).review?.box).toBe(2)
  })

  it('never goes past the last box', () => {
    let current = entry('a')
    for (let step = 0; step < 10; step += 1) current = applyGrade(current, 'easy', NOW)
    expect(current.review?.box).toBe(5)
    expect(current.review?.dueAt).toBe(NOW + 30 * DAY_MS)
  })

  it('does not change the original entry', () => {
    const original = entry('a')
    applyGrade(original, 'good', NOW)
    expect(original.review).toBeUndefined()
  })
})

describe('getDueEntries', () => {
  it('lists overdue words first (most overdue first), then new words oldest first, and leaves out the rest', () => {
    const overdueLong = entry('overdue-long', { review: { box: 1, dueAt: NOW - 3 * DAY_MS, lastReviewedAt: 0 } })
    const overdueShort = entry('overdue-short', { review: { box: 1, dueAt: NOW - DAY_MS, lastReviewedAt: 0 } })
    const newOld = entry('new-old', { addedAt: NOW - 5000 })
    const newRecent = entry('new-recent', { addedAt: NOW - 100 })
    const later = entry('later', { review: { box: 1, dueAt: NOW + DAY_MS, lastReviewedAt: 0 } })

    const ids = getDueEntries([later, newRecent, overdueShort, newOld, overdueLong], NOW).map((e) => e.id)
    expect(ids).toEqual(['overdue-long', 'overdue-short', 'new-old', 'new-recent'])
  })
})

describe('getIntervalLabel', () => {
  it('describes the wait each answer would give', () => {
    expect(getIntervalLabel(entry('a'), 'again')).toBe('10 دقائق')
    expect(getIntervalLabel(entry('a'), 'good')).toBe('يوم')
    expect(getIntervalLabel(entry('a'), 'easy')).toBe('3 أيام')
  })
})
