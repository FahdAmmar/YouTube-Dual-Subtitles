import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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
مرحباً

2
00:00:05,000 --> 00:00:08,000
جملة أخرى
`

const TRANSLATION_SRT = `1
00:00:01,000 --> 00:00:04,000
Hello

2
00:00:05,000 --> 00:00:08,000
Another sentence
`

describe('mobile active caption strip', () => {
  it('shows only the current line (no scrollable list) and updates as playback progresses', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))

    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    // قبل رفع أي ملف: لا يظهر الشريط المدمج إطلاقاً
    expect(screen.queryByTestId('mobile-active-caption')).not.toBeInTheDocument()

    const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>
    await fireEvent.change(fileInputs[0]!, { target: { files: [makeFile('ar.srt', SOURCE_SRT)] } })
    await fireEvent.change(fileInputs[1]!, { target: { files: [makeFile('en.srt', TRANSLATION_SRT)] } })

    // بعد جهوزية الملفين: يظهر الشريط، وبانتظار بدء التشغيل يعرض حالة محايدة
    const captionStrip = await screen.findByTestId('mobile-active-caption')
    expect(within(captionStrip).getByText('···')).toBeInTheDocument()

    // بدء التشغيل الفعلي عند لحظة تقع ضمن المقطع الأول
    expect(activePlayer).not.toBeNull()
    activePlayer!.setTime(2)
    fireEvent.click(screen.getByRole('button', { name: 'تشغيل' }))

    await waitFor(
      () => {
        expect(within(captionStrip).getByText('Hello')).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    // التقدّم إلى المقطع الثاني يُحدّث الشريط في مكانه دون أي حاجة للتمرير
    activePlayer!.setTime(6)
    await waitFor(
      () => {
        expect(within(captionStrip).getByText('Another sentence')).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })
})
