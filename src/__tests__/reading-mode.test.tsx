import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi, type MockYouTubePlayer } from './testHelpers/mockYouTubePlayer'
import { mockElementSize } from './testHelpers/mockLayout'

let activePlayer: MockYouTubePlayer | null = null

let restoreLayout: () => void = () => {}

beforeEach(() => {
  restoreLayout = mockElementSize()
  activePlayer = null
  window.localStorage.clear()
  installMockYouTubeApi((player) => {
    activePlayer = player
  })
})

afterEach(() => {
  restoreLayout()
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
})

const file = (name: string, content: string) => new File([content], name, { type: 'text/plain' })

const SOURCE_SRT = `1
00:00:01,000 --> 00:00:05,000
مرحباً بكم في هذا الفيديو

2
00:00:06,000 --> 00:00:10,000
جملة ثانية
`

const TRANSLATION_SRT = `1
00:00:01,000 --> 00:00:05,000
Welcome to this video today

2
00:00:06,000 --> 00:00:10,000
Second sentence here
`

async function openReadingMode({ withSubtitles = true, atTime }: { withSubtitles?: boolean; atTime?: number } = {}) {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

  if (withSubtitles) {
    fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), { target: { files: [file('ar.srt', SOURCE_SRT)] } })
    fireEvent.change(screen.getByLabelText('رفع ملف ترجمة الإنجليزية'), {
      target: { files: [file('en.srt', TRANSLATION_SRT)] },
    })
    await waitFor(() => expect(screen.getByText('ar.srt')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('en.srt')).toBeInTheDocument())
  }

  if (atTime !== undefined) activePlayer!.setTime(atTime)
  fireEvent.click(screen.getByRole('button', { name: 'فتح وضع القراءة' }))
  return screen.findByRole('region', { name: 'وضع القراءة' })
}

describe('reading mode', () => {
  it('shows every line with both languages and keeps the video mounted', async () => {
    const view = await openReadingMode()

    const cards = view.querySelectorAll('article')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.textContent).toContain('مرحباً بكم في هذا الفيديو')
    expect(cards[0]!.textContent).toContain('Welcome to this video today')
    // The player must stay in the DOM or playback would stop
    expect(screen.getByTestId('video-stage')).toBeInTheDocument()
  })

  it('lists the foreign (translation) text first, and swaps the order on request', async () => {
    const view = await openReadingMode()
    const firstParagraph = () => view.querySelector('article p')!.textContent

    expect(firstParagraph()).toContain('Welcome')
    fireEvent.click(within(view).getByRole('button', { name: 'تبديل ترتيب اللغتين' }))
    expect(firstParagraph()).toContain('مرحباً')
  })

  it('highlights the word being spoken and advances as time moves', async () => {
    const view = await openReadingMode()
    activePlayer!.setTime(1.3)
    fireEvent.click(within(view).getByRole('button', { name: 'تشغيل' }))

    const currentWord = () => view.querySelector('[data-word-state="current"]')?.textContent
    await waitFor(() => expect(view.querySelector('article[data-status="active"]')).not.toBeNull(), { timeout: 2000 })
    await waitFor(() => expect(currentWord()).toBe('Welcome'), { timeout: 2000 })

    activePlayer!.setTime(4.4)
    await waitFor(() => expect(currentWord()).toBe('today'), { timeout: 2000 })
    expect(view.querySelectorAll('[data-word-state="read"]').length).toBeGreaterThan(0)
  })

  it('changes the playback speed in quarter steps and resets it', async () => {
    const view = await openReadingMode()

    fireEvent.click(within(view).getByRole('button', { name: 'تسريع التشغيل' }))
    expect(activePlayer!.getPlaybackRate()).toBe(1.25)
    fireEvent.click(within(view).getByRole('button', { name: 'إبطاء التشغيل' }))
    fireEvent.click(within(view).getByRole('button', { name: 'إبطاء التشغيل' }))
    expect(activePlayer!.getPlaybackRate()).toBe(0.75)
    fireEvent.click(within(view).getByRole('button', { name: 'إعادة السرعة إلى 1×' }))
    expect(activePlayer!.getPlaybackRate()).toBe(1)
  })

  it('skips ten seconds forward and back, never below zero', async () => {
    const view = await openReadingMode()
    activePlayer!.setTime(30)

    fireEvent.click(within(view).getByRole('button', { name: 'تقديم 10 ثوانٍ' }))
    expect(activePlayer!.getCurrentTime()).toBe(40)
    activePlayer!.setTime(4)
    fireEvent.click(within(view).getByRole('button', { name: 'رجوع 10 ثوانٍ' }))
    expect(activePlayer!.getCurrentTime()).toBe(0)
  })

  it('seeks to a line when its card is clicked', async () => {
    const view = await openReadingMode()
    const secondCard = view.querySelectorAll('article')[1]!
    // The card's button is named by the sentence it contains (the label must include the visible text, WCAG 2.5.3)
    fireEvent.click(within(secondCard as HTMLElement).getByRole('button', { name: /جملة ثانية/ }))
    expect(activePlayer!.getCurrentTime()).toBe(6)
  })

  it('copies the whole transcript in the chosen language', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const view = await openReadingMode()

    fireEvent.click(within(view).getByRole('button', { name: 'نسخ النص' }))
    fireEvent.click(within(view).getByRole('menuitem', { name: /الترجمة فقط/ }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Welcome to this video today\nSecond sentence here'))
    expect(await within(view).findByText('تم نسخ النص')).toBeInTheDocument()
  })

  it('copies a single line from its card', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const view = await openReadingMode()

    fireEvent.click(within(view.querySelectorAll('article')[1] as HTMLElement).getByRole('button', { name: 'نسخ هذا المقطع' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('جملة ثانية\nSecond sentence here'))
  })

  it('repeats the current line while looping is on', async () => {
    const view = await openReadingMode()
    activePlayer!.setTime(2)
    fireEvent.click(within(view).getByRole('button', { name: 'تشغيل' }))
    await waitFor(() => expect(view.querySelector('article[data-status="active"]')).not.toBeNull(), { timeout: 2000 })

    fireEvent.click(within(view).getByRole('button', { name: 'تكرار الجملة الحالية' }))
    activePlayer!.setTime(5.1)
    await waitFor(() => expect(activePlayer!.getCurrentTime()).toBe(1), { timeout: 2000 })
  })

  it('hides the timestamps on request and remembers the choice', async () => {
    const view = await openReadingMode()
    expect(view.querySelector('article')!.textContent).toContain('0:01')

    fireEvent.click(within(view).getByRole('button', { name: 'إظهار الأزمنة' }))
    expect(view.querySelector('article')!.textContent).not.toContain('0:01')
    expect(window.localStorage.getItem('ydc:reading-prefs')).toContain('"showTimestamps":false')
  })

  it('closes with the button and again with the T shortcut, restoring the console', async () => {
    const view = await openReadingMode()
    fireEvent.click(within(view).getByRole('button', { name: 'إغلاق وضع القراءة' }))
    expect(screen.queryByRole('region', { name: 'وضع القراءة' })).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 't' })
    expect(await screen.findByRole('region', { name: 'وضع القراءة' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'T' })
    expect(screen.queryByRole('region', { name: 'وضع القراءة' })).not.toBeInTheDocument()
  })

  it('explains what to do when no subtitles are loaded', async () => {
    const view = await openReadingMode({ withSubtitles: false })
    expect(within(view).getByText(/لا توجد ترجمة لعرضها/)).toBeInTheDocument()
  })

  it('never shows an error screen', async () => {
    await openReadingMode()
    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
  })

  it('filters the lines while searching, in either language, and restores them when cleared', async () => {
    const view = await openReadingMode()
    const search = within(view).getByRole('searchbox', { name: 'بحث في النص' })

    fireEvent.change(search, { target: { value: 'second' } })
    expect(view.querySelectorAll('article')).toHaveLength(1)
    expect(within(view).getByText('1 نتيجة')).toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'جملة' } })
    expect(view.querySelectorAll('article')).toHaveLength(1)

    fireEvent.change(search, { target: { value: 'zzz' } })
    expect(view.querySelectorAll('article')).toHaveLength(0)
    expect(within(view).getByText(/لا توجد نتائج لـ/)).toBeInTheDocument()

    fireEvent.keyDown(search, { key: 'Escape' })
    expect(view.querySelectorAll('article')).toHaveLength(2)
  })

  it('keeps the original line number when a search leaves a later line', async () => {
    const view = await openReadingMode()
    fireEvent.change(within(view).getByRole('searchbox', { name: 'بحث في النص' }), { target: { value: 'second' } })
    fireEvent.click(within(view.querySelector('article') as HTMLElement).getByRole('button', { name: /جملة ثانية/ }))
    expect(activePlayer!.getCurrentTime()).toBe(6)
  })
})

describe('reading mode scrolling', () => {
  // jsdom has no layout, so this guards the call pattern behind a real bug: a "back to top" effect ran
  // on first render, right after the centring, and left the list scrolled to the top.
  // The virtualizer makes one scrollTo({ top: 0 }) of its own on mount, so a second one means the bug is back.
  it('only returns to the top when the search changes, never when the view opens', async () => {
    const scrollTo = vi.fn()
    const original = Element.prototype.scrollTo
    Element.prototype.scrollTo = scrollTo as never
    const topResets = () => scrollTo.mock.calls.filter(([arg]) => JSON.stringify(arg) === '{"top":0}').length
    try {
      const view = await openReadingMode({ atTime: 7 })
      await waitFor(() => expect(view.querySelector('article[data-status="active"]')).not.toBeNull())
      expect(topResets()).toBeLessThanOrEqual(1)
      const afterOpening = topResets()

      fireEvent.change(within(view).getByRole('searchbox', { name: 'بحث في النص' }), { target: { value: 'second' } })
      expect(topResets()).toBe(afterOpening + 1)
    } finally {
      Element.prototype.scrollTo = original
    }
  })
})

describe('reading mode with real word timings', () => {
  // "to" starts at 7 s and "today" at 8 s. An estimate by word length would already be on "today" at 7.2 s.
  const TIMED_VTT = `WEBVTT

00:00:01.000 --> 00:00:09.000
Welcome<00:00:07.000><c> to</c><00:00:08.000><c> today</c>
`

  it('follows the timings in the file instead of estimating', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('رفع ملف ترجمة الإنجليزية'), {
      target: { files: [file('en.vtt', TIMED_VTT)] },
    })
    await waitFor(() => expect(screen.getByText('en.vtt')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'فتح وضع القراءة' }))
    const view = await screen.findByRole('region', { name: 'وضع القراءة' })

    activePlayer!.setTime(7.2)
    fireEvent.click(within(view).getByRole('button', { name: 'تشغيل' }))

    await waitFor(() => expect(view.querySelector('[data-word-state="current"]')?.textContent).toBe('to'), {
      timeout: 2000,
    })
  })
})
