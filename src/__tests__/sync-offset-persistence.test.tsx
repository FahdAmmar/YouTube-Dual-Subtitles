import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'

const VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const SOURCE_SRT = `1\n00:00:01,000 --> 00:00:04,000\nمرحباً\n`

function makeFile(name: string, content: string) {
  return new File([content], name, { type: 'text/plain' })
}

beforeEach(() => {
  installMockYouTubeApi()
})

afterEach(() => {
  window.localStorage.clear()
})

async function loadVideoAndUploadSourceSubtitle(fileName: string) {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), { target: { value: VIDEO_URL } })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

  await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), {
    target: { files: [makeFile(fileName, SOURCE_SRT)] },
  })
  await waitFor(() => expect(screen.getByText(fileName)).toBeInTheDocument())
}

describe('sync offset persistence', () => {
  it('restores the saved offset when the same subtitle file is reloaded for the same video', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await loadVideoAndUploadSourceSubtitle('ar.srt')

    // تأخير المسار مرّتين (0.25 × 2 = 0.5)
    const delayButtons = screen.getAllByLabelText(/تأخير ترجمة/)
    fireEvent.click(delayButtons[0]!)
    fireEvent.click(delayButtons[0]!)
    await waitFor(() => expect(screen.getByText('+0.5ث')).toBeInTheDocument())

    // محاكاة إغلاق الصفحة وإعادة فتحها من جديد لنفس الفيديو ونفس الملف
    cleanup()
    await loadVideoAndUploadSourceSubtitle('ar.srt')

    await waitFor(() => expect(screen.getByText('+0.5ث')).toBeInTheDocument())

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('does not leak the offset to a different subtitle file uploaded for the same video', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await loadVideoAndUploadSourceSubtitle('ar-v1.srt')
    const delayButtons = screen.getAllByLabelText(/تأخير ترجمة/)
    fireEvent.click(delayButtons[0]!)
    await waitFor(() => expect(screen.getByText('+0.25ث')).toBeInTheDocument())

    cleanup()
    // ملف مختلف لنفس الفيديو: يجب ألا يرث إزاحة الملف السابق
    await loadVideoAndUploadSourceSubtitle('ar-v2.srt')

    expect(screen.getByText('0.0ث')).toBeInTheDocument()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('keeps the source and translation offsets independent when both come from one bilingual file', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const BILINGUAL_SRT = `1\n00:00:01,000 --> 00:00:04,000\nمرحباً\nHello\n`

    render(<App />)
    fireEvent.change(screen.getByLabelText('VIDEO_URL'), { target: { value: VIDEO_URL } })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    // ملف ثنائي واحد يُغذّي المسارين معاً — بنفس اسم الملف تماماً لكليهما
    await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة ثنائي اللغة'), {
      target: { files: [makeFile('dual.srt', BILINGUAL_SRT)] },
    })
    await waitFor(() => expect(screen.getAllByText('dual.srt').length).toBeGreaterThan(0))

    // تأخير مسار الترجمة فقط (الزر الثاني) — يجب ألا يتسرّب لمسار المصدر
    const delayButtons = screen.getAllByLabelText(/تأخير ترجمة/)
    expect(delayButtons.length).toBe(2)
    fireEvent.click(delayButtons[1]!)
    await waitFor(() => {
      expect(screen.getByText('0.0ث')).toBeInTheDocument() // المصدر: بلا تغيير
      expect(screen.getByText('+0.25ث')).toBeInTheDocument() // الترجمة: تأخّرت
    })

    cleanup()
    render(<App />)
    fireEvent.change(screen.getByLabelText('VIDEO_URL'), { target: { value: VIDEO_URL } })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
    await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة ثنائي اللغة'), {
      target: { files: [makeFile('dual.srt', BILINGUAL_SRT)] },
    })

    // بعد إعادة الفتح: كل مسار يستعيد إزاحته الخاصة فقط، لا إزاحة الآخر
    await waitFor(() => {
      expect(screen.getByText('0.0ث')).toBeInTheDocument()
      expect(screen.getByText('+0.25ث')).toBeInTheDocument()
    })

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })
})
