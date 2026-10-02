import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { LearningStatsCard } from './LearningStatsCard'
import { addWatchSeconds } from '@/lib/utils/learningStatsStore'
import { toggleBookmarkId } from '@/lib/utils/bookmarkStore'

beforeEach(() => window.localStorage.clear())

describe('LearningStatsCard', () => {
  it('renders nothing for a learner with no activity yet', () => {
    const { container } = render(<LearningStatsCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the streak, weekly time, and saved items', () => {
    addWatchSeconds(1500, new Date())
    toggleBookmarkId('youtube:a', 'x')
    toggleBookmarkId('youtube:a', 'y')

    render(<LearningStatsCard />)

    expect(within(screen.getByTestId('stat-streak')).getByText('1')).toBeInTheDocument()
    expect(screen.getByTestId('stat-week')).toHaveTextContent('25 د')
    expect(screen.getByTestId('stat-bookmarks')).toHaveTextContent('2')
    expect(screen.getByTestId('stat-words')).toHaveTextContent('0')
  })

  it('describes the 7-day chart in text for assistive technology, never by bar height alone', () => {
    addWatchSeconds(600, new Date())
    render(<LearningStatsCard />)

    const chart = screen.getByRole('img', { name: /آخر 7 أيام/ })
    expect(chart).toHaveAccessibleName(/10 د/)
  })
})
