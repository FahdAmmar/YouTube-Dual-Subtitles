import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'

beforeEach(() => {
  installMockYouTubeApi()
})

function makeVideoFile(name: string, type: string) {
  return new File(['fake video bytes'], name, { type })
}

/** محاكاة عنصر <video> جاهزاً بمدة محدَّدة — jsdom لا يُنفّذ فك ترميز فيديو حقيقياً فلن يُطلق loadedmetadata من تلقاء نفسه */
function simulateVideoReady(video: HTMLVideoElement, duration = 120) {
  Object.defineProperty(video, 'duration', { value: duration, configurable: true })
  fireEvent(video, new Event('loadedmetadata'))
}

describe('local video file upload', () => {
  it('plays a local file with the exact same controls as a YouTube video', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    // التبديل إلى تبويب "ملف من جهازي"
    fireEvent.click(screen.getByRole('radio', { name: '[ ملف من جهازي ]' }))

    const fileInput = screen.getByLabelText('اختيار ملف فيديو محلي') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('clip.mp4', 'video/mp4')] } })

    // ينتقل التطبيق مباشرة لمرحلة المشاهدة (لا شاشة انتظار وسيطة)
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    const video = document.querySelector('video') as HTMLVideoElement
    expect(video).toBeInTheDocument()
    expect(video.src).toContain('blob:')

    // قبل جهوزية البيانات الوصفية: شريط التحكم لا يظهر بعد
    expect(screen.queryByRole('button', { name: 'تشغيل' })).not.toBeInTheDocument()

    simulateVideoReady(video)

    // بعد الجهوزية: يظهر شريط تحكم مطابق تماماً لما يظهر مع فيديو يوتيوب
    const playButton = await screen.findByRole('button', { name: 'تشغيل' })
    fireEvent.click(playButton)
    fireEvent(video, new Event('play'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'إيقاف مؤقت' })).toBeInTheDocument())

    // اختصارات لوحة المفاتيح تعمل بنفس الطريقة تماماً مع الفيديو المحلي
    const rateButton = screen.getByRole('button', { name: /سرعة التشغيل الحالية/ })
    expect(rateButton).toHaveTextContent('1×')
    fireEvent.keyDown(window, { key: 'c' })
    await waitFor(() => expect(rateButton).toHaveTextContent('1.5×'))
    expect(video.playbackRate).toBe(1.5)

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('rejects unsupported file types with a clear error, without loading anything', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    fireEvent.click(screen.getByRole('radio', { name: '[ ملف من جهازي ]' }))

    const fileInput = screen.getByLabelText('اختيار ملف فيديو محلي') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [makeVideoFile('notes.txt', 'text/plain')] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('صيغة الملف غير مدعومة')
    // يبقى في شاشة الاختيار — لم ينتقل لمرحلة المشاهدة
    expect(screen.queryByText(/DISPLAY_MODE/)).not.toBeInTheDocument()

    errorSpy.mockRestore()
  })

  it('revokes the object URL when returning to the selection screen', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')

    render(<App />)
    fireEvent.click(screen.getByRole('radio', { name: '[ ملف من جهازي ]' }))
    fireEvent.change(screen.getByLabelText('اختيار ملف فيديو محلي'), {
      target: { files: [makeVideoFile('clip.mp4', 'video/mp4')] },
    })

    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
    const video = document.querySelector('video') as HTMLVideoElement
    const objectUrl = video.src
    simulateVideoReady(video)

    const backButton = await screen.findByRole('button', { name: /CHANGE_VIDEO/ })
    fireEvent.click(backButton)

    expect(revokeSpy).toHaveBeenCalledWith(objectUrl)
    revokeSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
