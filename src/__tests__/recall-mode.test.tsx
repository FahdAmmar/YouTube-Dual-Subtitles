import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi, type MockYouTubePlayer } from './testHelpers/mockYouTubePlayer'
import { fullText } from './testHelpers/fullText'

let activePlayer: MockYouTubePlayer | null = null

beforeEach(() => {
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
`

const TRANSLATION_SRT = `1
00:00:01,200 --> 00:00:04,200
Welcome to this video

2
00:00:05,200 --> 00:00:08,200
This is an example about coffee
`

async function loadRecallMode() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
  fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), { target: { files: [makeFile('ar.srt', SOURCE_SRT)] } })
  fireEvent.change(screen.getByLabelText('رفع ملف ترجمة الإنجليزية'), { target: { files: [makeFile('en.srt', TRANSLATION_SRT)] } })
  await waitFor(() => expect(screen.getByText('TRANSCRIPT — 2 SEG')).toBeInTheDocument())
  fireEvent.click(screen.getByRole('radio', { name: /RECALL/ }))
}

async function goToTime(seconds: number, expectedSource: string) {
  activePlayer?.setTime(seconds)
  await waitFor(() => expect(screen.getAllByText(expectedSource).length).toBeGreaterThan(1))
}

// Transcript panel only: the same sentence also appears in the overlay and the mobile strip
const transcript = () => within(screen.getByRole('complementary'))
const hiddenPlaceholders = () => screen.queryAllByText(/الترجمة مخفية/)
const overlayTranslation = (text: string) => screen.queryAllByText(text) // plain text: overlay + mobile caption

describe('recall mode (translation hidden until revealed)', () => {
  it('shows every source line but hides all translations, with a placeholder per card', async () => {
    await loadRecallMode()

    expect(screen.getByText('هذا مثال على القهوة العربية')).toBeInTheDocument()
    expect(screen.queryByText(fullText('Welcome to this video'))).not.toBeInTheDocument()
    expect(screen.queryByText(fullText('This is an example about coffee'))).not.toBeInTheDocument()
    expect(hiddenPlaceholders()).toHaveLength(2)
  })

  it('reveals only the active segment with the R key, and hides it again once the video moves on', async () => {
    await loadRecallMode()
    await goToTime(2, 'مرحباً بكم في هذا الفيديو')
    expect(overlayTranslation('Welcome to this video')).toHaveLength(0)

    fireEvent.keyDown(window, { key: 'r' })

    await waitFor(() => expect(transcript().getByText(fullText('Welcome to this video'))).toBeInTheDocument())
    expect(overlayTranslation('Welcome to this video').length).toBeGreaterThan(0)
    expect(transcript().queryByText(fullText('This is an example about coffee'))).not.toBeInTheDocument()

    await goToTime(6, 'هذا مثال على القهوة العربية')
    expect(transcript().queryByText(fullText('Welcome to this video'))).not.toBeInTheDocument()
    expect(overlayTranslation('This is an example about coffee')).toHaveLength(0)
  })

  it('offers a tappable reveal button in the mobile caption strip', async () => {
    await loadRecallMode()
    await goToTime(2, 'مرحباً بكم في هذا الفيديو')

    const strip = screen.getByTestId('mobile-active-caption')
    fireEvent.click(within(strip).getByRole('button', { name: /اكشف الترجمة/ }))

    await waitFor(() => expect(within(strip).getByText('Welcome to this video')).toBeInTheDocument())
  })

  it('goes back to showing every translation when switching to BOTH', async () => {
    await loadRecallMode()
    fireEvent.click(screen.getByRole('radio', { name: /BOTH/ }))

    expect(screen.getByText(fullText('Welcome to this video'))).toBeInTheDocument()
    expect(hiddenPlaceholders()).toHaveLength(0)
  })

  it('lists the R shortcut in the help panel', async () => {
    await loadRecallMode()
    fireEvent.keyDown(window, { key: '?' })
    const dialog = await screen.findByRole('dialog', { name: 'اختصارات لوحة المفاتيح' })
    expect(within(dialog).getByText('R')).toBeInTheDocument()
  })
})
