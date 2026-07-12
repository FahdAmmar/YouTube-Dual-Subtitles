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

const SOURCE_SRT = `1
00:00:01,000 --> 00:00:04,000
مرحباً بكم في هذا الفيديو

2
00:00:05,000 --> 00:00:08,000
هذا مثال على الترجمة العربية
`

const TRANSLATION_SRT = `1
00:00:01,200 --> 00:00:04,200
Welcome to this video

2
00:00:05,200 --> 00:00:08,200
This is an example of the translation
`

describe('full dual-subtitle workflow', () => {
  it('uploads both tracks, adjusts sync offset, and highlights the active line without crashing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))

    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>
    expect(fileInputs.length).toBe(2)

    await fireEvent.change(fileInputs[0]!, { target: { files: [makeFile('ar.srt', SOURCE_SRT)] } })
    await fireEvent.change(fileInputs[1]!, { target: { files: [makeFile('en.srt', TRANSLATION_SRT)] } })

    await waitFor(() => {
      expect(screen.getByText('ar.srt')).toBeInTheDocument()
      expect(screen.getByText('en.srt')).toBeInTheDocument()
    })

    // يجب أن يظهر النصان في لوحة النص المتزامن
    await waitFor(() => {
      expect(screen.getByText('مرحباً بكم في هذا الفيديو')).toBeInTheDocument()
      expect(screen.getByText('Welcome to this video')).toBeInTheDocument()
    })

    // ضبط إزاحة التزامن لمسار المصدر (زر +) عدة مرات
    const nudgeButtons = screen.getAllByLabelText(/تأخير ترجمة/)
    expect(nudgeButtons.length).toBeGreaterThan(0)
    fireEvent.click(nudgeButtons[0]!)
    fireEvent.click(nudgeButtons[0]!)

    // تحريك زمن الفيديو الوهمي إلى منتصف المقطع الأول، ثم بدء التشغيل
    // الفعلي (يُصدر المحاكي onStateChange بحالة PLAYING تماماً كيوتيوب
    // الحقيقي)، ما يُفعّل مؤقت الاستطلاع في usePlayerTime
    expect(activePlayer).not.toBeNull()
    activePlayer!.setTime(2.5)
    fireEvent.click(screen.getByRole('button', { name: 'تشغيل' }))

    // انتظار نبضة زمنية حقيقية (120ms) تجعل لوحة النص تكتشف المقطع النشط وتعرض مؤشر التقدّم
    await waitFor(
      () => {
        const progressBars = document.querySelectorAll('[role="progressbar"]')
        expect(progressBars.length).toBeGreaterThan(0)
      },
      { timeout: 2000 },
    )

    // لا تظهر شاشة الخطأ العامة في أي وقت خلال هذا التدفق الكامل
    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()

    errorSpy.mockRestore()
  })
})
