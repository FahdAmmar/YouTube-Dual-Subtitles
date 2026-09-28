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

const SOURCE_SRT = `1\n00:00:01,000 --> 00:00:04,000\nمرحباً بكم\n`
const TRANSLATION_SRT = `1\n00:00:01,200 --> 00:00:04,200\nWelcome\n`

async function loadVideoWithSubtitles() {
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
  await waitFor(() => expect(screen.getByText('TRANSCRIPT — 1 SEG')).toBeInTheDocument())
}

describe('segment text-to-speech button', () => {
  it('is not rendered when the browser has no speechSynthesis support', async () => {
    await loadVideoWithSubtitles()
    expect(screen.queryByLabelText('نطق نص هذا المقطع بصوت الجهاز')).not.toBeInTheDocument()
  })

  describe('with speechSynthesis available', () => {
    let speak: ReturnType<typeof vi.fn>
    let cancel: ReturnType<typeof vi.fn>

    beforeEach(() => {
      speak = vi.fn()
      cancel = vi.fn()
      Object.defineProperty(window, 'speechSynthesis', {
        value: { speak, cancel },
        configurable: true,
        writable: true,
      })
    })

    it('speaks the foreign-language segment text without seeking the video', async () => {
      await loadVideoWithSubtitles()

      const speakButton = screen.getByLabelText('نطق نص هذا المقطع بصوت الجهاز')
      fireEvent.click(speakButton)

      expect(cancel).toHaveBeenCalledTimes(1)
      expect(speak).toHaveBeenCalledTimes(1)
      const utterance = speak.mock.calls[0]?.[0] as SpeechSynthesisUtterance
      expect(utterance.text).toBe('Welcome')
      expect(utterance.lang).toBe('en')

      // النقر على زر النطق يجب ألا "يُسرّب" حدث القفز الخاص ببطاقة المقطع
      expect(activePlayer?.getCurrentTime()).toBe(0)
    })

    it('still seeks the video when the rest of the segment card is clicked', async () => {
      await loadVideoWithSubtitles()

      // ملاحظة: لا يُنقر على نص "Welcome" نفسه هنا، فكل كلمة أصبحت عنصراً
      // قابلاً للنقر مستقلاً لفتح بطاقة تعريفها (انظر word-lookup-and-glossary.test.tsx)
      // ويُوقِف انتشار الحدث عمداً؛ فنُنقر بدلاً منه على الطابع الزمني المجاور
      fireEvent.click(screen.getByText('0:01'))
      // موضع القفز يعتمد الخط الزمني الأساسي (توقيت المسار المصدر)، وليس
      // توقيت المسار الأجنبي بالضرورة — انظر التوثيق في pairCues.ts
      expect(activePlayer?.getCurrentTime()).toBeCloseTo(1, 1)
    })
  })
})
