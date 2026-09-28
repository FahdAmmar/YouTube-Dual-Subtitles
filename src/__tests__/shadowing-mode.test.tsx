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

function makeFile(name: string, content: string) {
  return new File([content], name, { type: 'text/plain' })
}

// ثلاثة مقاطع بمحاذاة واضحة: [1→4], [5→8], [9→12]
const SOURCE_SRT = `1\n00:00:01,000 --> 00:00:04,000\nمرحباً بكم\n\n2\n00:00:05,000 --> 00:00:08,000\nهذا مثال\n\n3\n00:00:09,000 --> 00:00:12,000\nشكراً\n`
const TRANSLATION_SRT = `1\n00:00:01,000 --> 00:00:04,000\nWelcome\n\n2\n00:00:05,000 --> 00:00:08,000\nThis is an example\n\n3\n00:00:09,000 --> 00:00:12,000\nThanks\n`

async function loadPlayingVideoWithSubtitles() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

  await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), {
    target: { files: [makeFile('ar.srt', SOURCE_SRT)] },
  })
  await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة الإنجليزية'), {
    target: { files: [makeFile('en.srt', TRANSLATION_SRT)] },
  })
  await waitFor(() => expect(screen.getByText('Welcome')).toBeInTheDocument())

  // بدء التشغيل فعلياً — وضع التظليل لا يفعل شيئاً أثناء الإيقاف المؤقت
  fireEvent.click(screen.getByRole('button', { name: 'تشغيل' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'إيقاف مؤقت' })).toBeInTheDocument())
}

describe('shadowing mode', () => {
  it('auto-pauses once playback naturally reaches the next segment, and shows a status badge', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadPlayingVideoWithSubtitles()

    fireEvent.keyDown(window, { key: 's' })
    expect(screen.getByText('وضع التظليل')).toBeInTheDocument()

    // منتصف المقطع الأول — دورة استطلاع واحدة على الأقل لتثبيت خط الأساس
    // (لا يجب أن يُوقَف الفيديو عند أول مقطع يُكتشَف بعد التفعيل مباشرة)
    activePlayer!.setTime(2.5)
    await new Promise((resolve) => setTimeout(resolve, 350))
    expect(screen.getByRole('button', { name: 'إيقاف مؤقت' })).toBeInTheDocument()

    // تقدّم طبيعي إلى المقطع الثاني مباشرة بعده — يجب أن يُوقَف تلقائياً
    activePlayer!.setTime(5.5)
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: 'تشغيل' })).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('does not auto-pause on a manual jump that skips over a segment', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadPlayingVideoWithSubtitles()

    fireEvent.keyDown(window, { key: 's' })

    // خط الأساس عند المقطع الأول
    activePlayer!.setTime(2.5)
    await new Promise((resolve) => setTimeout(resolve, 350))

    // قفزة يدوية تتخطّى المقطع الثاني بالكامل إلى الثالث مباشرة
    activePlayer!.setTime(9.5)
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(screen.getByRole('button', { name: 'إيقاف مؤقت' })).toBeInTheDocument()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('does nothing while shadowing mode is disabled', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadPlayingVideoWithSubtitles()

    activePlayer!.setTime(2.5)
    await new Promise((resolve) => setTimeout(resolve, 350))
    activePlayer!.setTime(5.5)
    await new Promise((resolve) => setTimeout(resolve, 500))

    expect(screen.getByRole('button', { name: 'إيقاف مؤقت' })).toBeInTheDocument()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })
})
