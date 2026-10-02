import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within, type Matcher } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi, type MockYouTubePlayer } from './testHelpers/mockYouTubePlayer'
import { fullText } from './testHelpers/fullText'

let activePlayer: MockYouTubePlayer | null = null

beforeEach(() => {
  window.localStorage.clear()
  activePlayer = null
  installMockYouTubeApi((player) => {
    activePlayer = player
  })
})

const makeFile = (name: string, content: string) => new File([content], name, { type: 'text/plain' })

const SOURCE_SRT = `1
00:00:01,000 --> 00:00:04,000
مرحباً بكم في هذا الفيديو

2
00:00:05,000 --> 00:00:08,000
هذا مثال على القهوة العربية

3
00:00:09,000 --> 00:00:12,000
شكراً على المشاهدة
`

async function loadVideoWithSubtitles() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
  fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), { target: { files: [makeFile('ar.srt', SOURCE_SRT)] } })
  await waitFor(() => expect(screen.getByText('TRANSCRIPT — 3 SEG')).toBeInTheDocument())
}

const transcript = () => within(screen.getByRole('complementary'))
// The star buttons only: the header filter button also mentions "المفضلة" but not "هذا المقطع"
const stars = () => transcript().getAllByRole('button', { name: /هذا المقطع .*المفضلة/ })
function star(index: number): HTMLElement {
  const element = stars()[index]
  if (!element) throw new Error(`No star button at index ${index}`)
  return element
}
const cardText = (matcher: Matcher) => transcript().queryByText(matcher)

describe('bookmarked sentences', () => {
  it('toggles a bookmark from the star on a card', async () => {
    await loadVideoWithSubtitles()
    expect(star(0)).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(star(0))

    expect(star(0)).toHaveAttribute('aria-pressed', 'true')
    expect(star(1)).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(star(0))
    expect(star(0)).toHaveAttribute('aria-pressed', 'false')
  })

  it('bookmarks the segment playing right now with the B key and confirms it on screen', async () => {
    await loadVideoWithSubtitles()
    activePlayer?.setTime(6)

    fireEvent.keyDown(window, { key: 'b' })

    await waitFor(() => expect(star(1)).toHaveAttribute('aria-pressed', 'true'))
    expect(star(0)).toHaveAttribute('aria-pressed', 'false')
    expect(await screen.findByText('أُضيفت الجملة إلى المفضلة')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'b' })
    await waitFor(() => expect(star(1)).toHaveAttribute('aria-pressed', 'false'))
  })

  it('does nothing on B between segments', async () => {
    await loadVideoWithSubtitles()
    activePlayer?.setTime(4.5)
    fireEvent.keyDown(window, { key: 'b' })
    stars().forEach((button) => expect(button).toHaveAttribute('aria-pressed', 'false'))
  })

  it('filters the transcript to bookmarked sentences only, and back', async () => {
    await loadVideoWithSubtitles()
    fireEvent.click(star(2))

    fireEvent.click(screen.getByRole('button', { name: 'عرض المفضلة فقط' }))

    expect(cardText(fullText('شكراً على المشاهدة'))).toBeInTheDocument()
    expect(cardText(fullText('هذا مثال على القهوة العربية'))).not.toBeInTheDocument()
    expect(screen.getByText('TRANSCRIPT — 1/3 SEG')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'عرض كل الجمل' }))
    expect(cardText(fullText('هذا مثال على القهوة العربية'))).toBeInTheDocument()
  })

  it('explains how to add bookmarks when the favourites filter is empty', async () => {
    await loadVideoWithSubtitles()
    fireEvent.click(screen.getByRole('button', { name: 'عرض المفضلة فقط' }))
    expect(screen.getByText(/لم تحفظ أي جملة بعد/)).toBeInTheDocument()
  })

  it('remembers bookmarks after the app is reopened with the same video and subtitles', async () => {
    await loadVideoWithSubtitles()
    fireEvent.click(star(0))
    document.body.innerHTML = ''

    await loadVideoWithSubtitles()
    expect(star(0)).toHaveAttribute('aria-pressed', 'true')
  })

  it('lists the B shortcut in the help panel', async () => {
    await loadVideoWithSubtitles()
    fireEvent.keyDown(window, { key: '?' })
    const dialog = await screen.findByRole('dialog', { name: 'اختصارات لوحة المفاتيح' })
    expect(within(dialog).getByText('B')).toBeInTheDocument()
  })
})
