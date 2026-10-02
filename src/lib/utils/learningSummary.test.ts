import { describe, it, expect, beforeEach } from 'vitest'
import { addWatchSeconds } from './learningStatsStore'
import { saveGlossaryEntry, makeGlossaryEntryId } from './glossaryStore'
import { toggleBookmarkId } from './bookmarkStore'
import { getLearningSummary } from './learningSummary'

const day = (month: number, date: number) => new Date(2026, month - 1, date, 12)
const TODAY = day(10, 1)

beforeEach(() => window.localStorage.clear())

function saveWord(word: string) {
  saveGlossaryEntry({
    id: makeGlossaryEntryId(word, 'de'),
    word,
    languageCode: 'de',
    partOfSpeech: 'noun',
    translation: null,
    definition: 'A word.',
    example: null,
    addedAt: 1,
  })
}

describe('getLearningSummary', () => {
  it('reports no data for a brand new learner', () => {
    const summary = getLearningSummary(TODAY)
    expect(summary.hasData).toBe(false)
    expect(summary).toMatchObject({ streak: 0, weekSeconds: 0, wordCount: 0, bookmarkCount: 0 })
    expect(summary.days).toHaveLength(7)
  })

  it('combines watch time, streak, saved words and bookmarks', () => {
    addWatchSeconds(600, day(10, 1))
    addWatchSeconds(120, day(9, 30))
    addWatchSeconds(900, day(9, 20))
    saveWord('Haus')
    saveWord('Baum')
    toggleBookmarkId('youtube:a', 'x')

    const summary = getLearningSummary(TODAY)

    expect(summary.hasData).toBe(true)
    expect(summary.streak).toBe(2)
    expect(summary.weekSeconds).toBe(720) // Sep 20 is outside the last 7 days
    expect(summary.wordCount).toBe(2)
    expect(summary.bookmarkCount).toBe(1)
    expect(summary.days.at(-1)?.seconds).toBe(600)
  })

  it('has data as soon as a single word is saved, even with no watch time', () => {
    saveWord('Haus')
    expect(getLearningSummary(TODAY).hasData).toBe(true)
  })
})
