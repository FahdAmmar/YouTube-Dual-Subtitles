import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'

class MockPlayer {
  constructor(elementId: string, options: any) {
    const el = document.getElementById(elementId)
    if (!el) {
      throw new Error(`MockPlayer: container #${elementId} not found`)
    }
    setTimeout(() => {
      options.events?.onReady?.({ target: this })
    }, 0)
  }
  getDuration() { return 120 }
  getCurrentTime() { return 0 }
  getPlayerState() { return 1 }
  playVideo() {}
  pauseVideo() {}
  seekTo() {}
  mute() {}
  unMute() {}
  isMuted() { return false }
  setVolume() {}
  getVolume() { return 100 }
  destroy() {}
}

beforeEach(() => {
  (window as any).YT = { Player: MockPlayer }
})

function makeSrtFile(name: string, content: string) {
  return new File([content], name, { type: 'text/plain' })
}

const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:04,000
مرحباً بكم في هذا الفيديو

2
00:00:04,500 --> 00:00:08,000
هذا مثال على الترجمة
`

describe('reproduce upload crash', () => {
  it('loads a video and uploads a subtitle file without crashing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    const input = screen.getByLabelText('VIDEO_URL')
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))

    // انتظار جاهزية المشغّل
    await waitFor(() => {
      expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument()
    })

    // العثور على أول مدخل رفع ملف (مسار المصدر)
    const fileInputs = document.querySelectorAll('input[type="file"]')
    expect(fileInputs.length).toBeGreaterThan(0)
    const fileInput = fileInputs[0] as HTMLInputElement

    const file = makeSrtFile('test.srt', SAMPLE_SRT)
    await fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('test.srt')).toBeInTheDocument()
    })

    // تأكد من عدم ظهور شاشة الخطأ (ErrorBoundary fallback)
    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()

    errorSpy.mockRestore()
  })
})
