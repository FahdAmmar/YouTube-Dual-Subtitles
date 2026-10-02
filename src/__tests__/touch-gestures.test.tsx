import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi, type MockYouTubePlayer } from './testHelpers/mockYouTubePlayer'

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

async function loadVideoWithSubtitles() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
  fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), { target: { files: [makeFile('ar.srt', SOURCE_SRT)] } })
  await waitFor(() => expect(screen.getByText('TRANSCRIPT — 2 SEG')).toBeInTheDocument())

  const layer = await screen.findByTestId('video-gesture-layer')
  vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 300, height: 170, right: 300, bottom: 170, x: 0, y: 0, toJSON: () => ({}) })
  return layer
}

const touch = { pointerType: 'touch', isPrimary: true }
const tap = (layer: HTMLElement, x: number) => {
  fireEvent.pointerDown(layer, { ...touch, clientX: x, clientY: 80 })
  fireEvent.pointerUp(layer, { ...touch, clientX: x, clientY: 80 })
}

describe('touch gestures on the video', () => {
  it('skips forward 10 seconds on a double tap on the right side and says so on screen', async () => {
    const layer = await loadVideoWithSubtitles()
    activePlayer?.setTime(20)

    tap(layer, 260)
    tap(layer, 260)

    expect(activePlayer?.getCurrentTime()).toBe(30)
    expect(await screen.findByText('+10 ث')).toBeInTheDocument()
  })

  it('skips back 10 seconds on a double tap on the left side, never below zero', async () => {
    const layer = await loadVideoWithSubtitles()
    activePlayer?.setTime(4)

    tap(layer, 30)
    tap(layer, 30)

    expect(activePlayer?.getCurrentTime()).toBe(0)
  })

  it('jumps to the next and previous subtitle segment with a horizontal swipe', async () => {
    const layer = await loadVideoWithSubtitles()
    activePlayer?.setTime(2)

    fireEvent.pointerDown(layer, { ...touch, clientX: 240, clientY: 80 })
    fireEvent.pointerUp(layer, { ...touch, clientX: 120, clientY: 84 })
    expect(activePlayer?.getCurrentTime()).toBe(5)

    fireEvent.pointerDown(layer, { ...touch, clientX: 100, clientY: 80 })
    fireEvent.pointerUp(layer, { ...touch, clientX: 220, clientY: 78 })
    expect(activePlayer?.getCurrentTime()).toBe(1)
  })

  it('toggles playback on a single tap, once the double-tap window closes', async () => {
    const layer = await loadVideoWithSubtitles()
    const toggleFeedback = () => screen.queryByText(/^(تشغيل|إيقاف مؤقت)$/, { selector: 'span.font-mono' })

    tap(layer, 150)
    expect(toggleFeedback()).not.toBeInTheDocument()

    await waitFor(() => expect(toggleFeedback()).toBeInTheDocument())
  })

  it('sits below the control bar, so the bar stays tappable', async () => {
    const layer = await loadVideoWithSubtitles()
    const stage = screen.getByTestId('video-stage')
    const controlBar = stage.querySelector(':scope > div.bottom-0')
    const siblings = [...stage.children]

    expect(controlBar).not.toBeNull()
    expect(siblings.indexOf(layer)).toBeGreaterThan(-1)
    expect(siblings.indexOf(controlBar as Element)).toBeGreaterThan(siblings.indexOf(layer))
  })
})
