import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { installMockVimeoApi, type MockVimeoPlayer } from './testHelpers/mockVimeoPlayer'

let latestVimeoPlayer: MockVimeoPlayer | null = null

beforeEach(() => {
  latestVimeoPlayer = null
  installMockVimeoApi((player) => {
    latestVimeoPlayer = player
  })
})

async function loadVimeoVideo(url = 'https://vimeo.com/76979871') {
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), { target: { value: url } })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
}

describe('Vimeo playback', () => {
  it('auto-detects a plain vimeo.com URL and loads it (no hash)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    await loadVimeoVideo('https://vimeo.com/76979871')

    expect(latestVimeoPlayer?.getOptions().id).toBe(76979871)
    expect(latestVimeoPlayer?.getOptions().h).toBeUndefined()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('passes the privacy hash through for an unlisted-video URL, so it can actually play', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    await loadVimeoVideo('https://vimeo.com/76979871/8272103f6e')

    expect(latestVimeoPlayer?.getOptions().id).toBe(76979871)
    expect(latestVimeoPlayer?.getOptions().h).toBe('8272103f6e')

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('rejects a URL that is neither YouTube nor Vimeo', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://example.com/not-a-video' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('الرجاء إدخال رابط يوتيوب أو Vimeo صالح')
    expect(screen.queryByText(/DISPLAY_MODE/)).not.toBeInTheDocument()
  })

  it('toggles play/pause via the Space shortcut, same as any other source', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    await loadVimeoVideo()

    fireEvent.keyDown(window, { key: ' ' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'إيقاف مؤقت' })).toBeInTheDocument())

    fireEvent.keyDown(window, { key: ' ' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'تشغيل' })).toBeInTheDocument())

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('shows a clear error message when the video fails to load (private/deleted/restricted)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    fireEvent.change(screen.getByLabelText('VIDEO_URL'), { target: { value: 'https://vimeo.com/76979871' } })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))

    await waitFor(() => expect(latestVimeoPlayer).not.toBeNull())
    latestVimeoPlayer?.simulateError('هذا الفيديو خاص')

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('هذا الفيديو خاص'))

    errorSpy.mockRestore()
  })

  it('records the Vimeo title in watch history via getVideoTitle()', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    await loadVimeoVideo()
    fireEvent.click(screen.getByRole('button', { name: /CHANGE_VIDEO/ }))

    expect(await screen.findByText('فيديو Vimeo تجريبي للاختبار')).toBeInTheDocument()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('supports dual subtitles over a Vimeo video exactly like any other source', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const srtContent = `1\n00:00:01,000 --> 00:00:04,000\nمرحباً\n`

    render(<App />)
    await loadVimeoVideo()

    await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), {
      target: { files: [new File([srtContent], 'ar.srt', { type: 'text/plain' })] },
    })
    await waitFor(() => expect(screen.getByText('ar.srt')).toBeInTheDocument())
    expect(screen.getByText('مرحباً')).toBeInTheDocument()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('reflects live playback position from Vimeo timeupdate events (the core async/sync bridge)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    await loadVimeoVideo()

    // usePlayerTime يقرأ getCurrentTime بشكل متزامن 5 مرات في الثانية، بينما
    // Vimeo API بالكامل غير متزامن (Promise) — هذا يتحقق تحديداً أن آلية
    // الجسر (تخزين آخر وقت معروف في ref عبر حدث timeupdate) تعمل فعلياً
    latestVimeoPlayer?.setTime(42)
    await waitFor(() => expect(screen.getByText(/0:42/)).toBeInTheDocument())

    errorSpy.mockRestore()
  })

  it('resumes a Vimeo video from watch history with its privacy hash intact (not just the numeric id)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    await loadVimeoVideo('https://vimeo.com/76979871/8272103f6e')
    fireEvent.click(screen.getByRole('button', { name: /CHANGE_VIDEO/ }))

    latestVimeoPlayer = null
    const historyButtons = await screen.findAllByRole('button', { name: /فيديو Vimeo تجريبي للاختبار/ })
    fireEvent.click(historyButtons[0]!)
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    // لو ضاعت التجزئة عبر مسار السجل، سيفشل تشغيل هذا الفيديو غير
    // المُدرَج فعلياً رغم نجاح استعادة المعرّف الرقمي وحده
    // (type assertion ضرورية: TS يُضيّق النوع إلى null بعد الإسناد اليدوي
    // أعلاه، ولا يتتبّع إعادة التعيين غير المتزامنة عبر onInstanceCreated)
    expect((latestVimeoPlayer as MockVimeoPlayer | null)?.getOptions().h).toBe('8272103f6e')

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })
})
