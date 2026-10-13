import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

afterEach(() => restoreLayout())

const file = (name: string, content: string) => new File([content], name, { type: 'text/plain' })

// Subtitles that run 5 % slow: the line at 100 s of the file is really at 105 s, the one at 1000 s at 1050 s
const DRIFTING_SRT = `1
00:01:40,000 --> 00:01:42,000
First anchor line

2
00:16:40,000 --> 00:16:42,000
Second anchor line
`

async function loadDriftingTrack() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
  fireEvent.change(screen.getByLabelText('رفع ملف ترجمة الإنجليزية'), {
    target: { files: [file('en.srt', DRIFTING_SRT)] },
  })
  await waitFor(() => expect(screen.getByText('en.srt')).toBeInTheDocument())
}

const anchorTime = (seconds: number) => {
  activePlayer!.setTime(seconds)
}

describe('two-point sync', () => {
  it('stretches and shifts the subtitles so both anchors land on the video times', async () => {
    await loadDriftingTrack()
    fireEvent.click(screen.getByRole('button', { name: /مزامنة بنقطتين/ }))

    anchorTime(105)
    fireEvent.click(screen.getAllByRole('button', { name: 'ثبّت وقت الفيديو الحالي' })[0]!)
    anchorTime(1050)
    fireEvent.click(screen.getAllByRole('button', { name: 'ثبّت وقت الفيديو الحالي' })[1]!)
    fireEvent.click(screen.getByRole('button', { name: 'طبّق المزامنة' }))

    expect(await screen.findByText('en.synced.srt')).toBeInTheDocument()
    expect(screen.getByText('تمت المزامنة وحُفظت للملف.')).toBeInTheDocument()

    // The first cue now starts at 105 s: seek there and it is the active line
    fireEvent.click(screen.getByRole('button', { name: 'فتح وضع القراءة' }))
    await screen.findByRole('region', { name: 'وضع القراءة' })
    const secondCard = document.querySelectorAll('article')[1]!
    fireEvent.click(secondCard.querySelector('[role="button"]')!)
    expect(activePlayer!.getCurrentTime()).toBeCloseTo(1050, 1)
  })

  it('rejects anchors that make no sense and leaves the subtitles unchanged', async () => {
    await loadDriftingTrack()
    fireEvent.click(screen.getByRole('button', { name: /مزامنة بنقطتين/ }))

    anchorTime(500)
    fireEvent.click(screen.getAllByRole('button', { name: 'ثبّت وقت الفيديو الحالي' })[0]!)
    anchorTime(20)
    fireEvent.click(screen.getAllByRole('button', { name: 'ثبّت وقت الفيديو الحالي' })[1]!)
    fireEvent.click(screen.getByRole('button', { name: 'طبّق المزامنة' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/لا يتوافقان/)
    expect(screen.getByText('en.srt')).toBeInTheDocument()
  })

  it('keeps the apply button disabled until both times are set', async () => {
    await loadDriftingTrack()
    fireEvent.click(screen.getByRole('button', { name: /مزامنة بنقطتين/ }))
    expect(screen.getByRole('button', { name: 'طبّق المزامنة' })).toBeDisabled()
  })
})
