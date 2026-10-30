import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'
import { STORAGE_KEYS } from '@/constants/theme.constants'

const GUIDE_TITLE = 'ابدأ في ثلاث خطوات'

function seedHistory() {
  const entry = {
    videoKey: 'youtube:abc123',
    source: { type: 'youtube', videoId: 'abc123' },
    displayName: 'فيديو سابق',
    lastWatchedAt: Date.now(),
    subtitleFileNames: {},
  }
  window.localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify({ [entry.videoKey]: entry }))
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('first-run guide on the home screen', () => {
  it('walks a new visitor through the three steps', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: GUIDE_TITLE })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('explains where subtitle files come from, since the app does not fetch them', () => {
    render(<App />)
    const help = screen.getByText('كيف أحصل على ملف الترجمة؟')
    expect(help).toBeInTheDocument()
    expect(screen.getByText(/^yt-dlp --skip-download/)).toBeInTheDocument()
  })

  it('can be dismissed, stays dismissed after a reload, and can be brought back', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'فهمت، أخفِ الدليل' }))
    expect(screen.queryByRole('heading', { name: GUIDE_TITLE })).not.toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEYS.ONBOARDING_DISMISSED)).toBe('true')
    unmount()

    render(<App />)
    expect(screen.queryByRole('heading', { name: GUIDE_TITLE })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'دليل البدء' }))
    expect(screen.getByRole('heading', { name: GUIDE_TITLE })).toBeInTheDocument()
  })

  it('stays out of the way of someone who already watched videos, but is one click away', () => {
    seedHistory()
    render(<App />)
    expect(screen.queryByRole('heading', { name: GUIDE_TITLE })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'دليل البدء' }))
    expect(screen.getByRole('heading', { name: GUIDE_TITLE })).toBeInTheDocument()
  })

  it('does not hide the video form behind the guide', () => {
    render(<App />)
    expect(screen.getByLabelText('رابط الفيديو')).toBeInTheDocument()
  })
})
