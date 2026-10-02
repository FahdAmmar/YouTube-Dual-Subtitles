import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi, type MockYouTubePlayer } from './testHelpers/mockYouTubePlayer'

type Handler = (details: Record<string, unknown>) => void

let activePlayer: MockYouTubePlayer | null = null
let handlers: Map<string, Handler | null>
let session: { metadata: { title: string } | null; playbackState: string }

beforeEach(() => {
  activePlayer = null
  handlers = new Map()
  session = { metadata: null, playbackState: 'none' }
  Object.defineProperty(navigator, 'mediaSession', {
    configurable: true,
    value: Object.assign(session, {
      setActionHandler: (action: string, handler: Handler | null) => handlers.set(action, handler),
      setPositionState: () => {},
    }),
  })
  vi.stubGlobal('MediaMetadata', class { constructor(init: { title: string }) { this.title = init.title } title: string })
  installMockYouTubeApi((player) => {
    activePlayer = player
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'mediaSession')
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
}

describe('Media Session integration', () => {
  it('shows the video title in the OS media controls once the player is ready', async () => {
    await loadVideoWithSubtitles()
    await waitFor(() => expect(session.metadata?.title).toBe('فيديو تجريبي للاختبار'))
  })

  it('jumps to the next and previous subtitle segment from the OS track buttons', async () => {
    await loadVideoWithSubtitles()
    await waitFor(() => expect(handlers.get('nexttrack')).toBeTypeOf('function'))

    activePlayer?.setTime(2)
    handlers.get('nexttrack')?.({})
    expect(activePlayer?.getCurrentTime()).toBe(5)

    handlers.get('previoustrack')?.({})
    expect(activePlayer?.getCurrentTime()).toBe(1)
  })

  it('seeks from the OS scrubber', async () => {
    await loadVideoWithSubtitles()
    await waitFor(() => expect(handlers.get('seekto')).toBeTypeOf('function'))

    handlers.get('seekto')?.({ seekTime: 30 })
    expect(activePlayer?.getCurrentTime()).toBe(30)
  })
})
