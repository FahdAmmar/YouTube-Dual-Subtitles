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

// مقاطع بمحاذاة واضحة: [1→4], [5→8] — يُسهّل التحقق من القفز لبداية المشهد
const SOURCE_SRT = `1
00:00:01,000 --> 00:00:04,000
مرحباً بكم

2
00:00:05,000 --> 00:00:08,000
هذا مثال
`

const TRANSLATION_SRT = `1
00:00:01,000 --> 00:00:04,000
Welcome

2
00:00:05,000 --> 00:00:08,000
This is an example
`

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

  await waitFor(() => {
    expect(screen.getByText('Welcome')).toBeInTheDocument()
  })

  expect(activePlayer).not.toBeNull()
}

describe('scene repeat keyboard shortcuts', () => {
  it('pressing 0 restarts the current scene from its start', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadVideoWithSubtitles()

    // ضع المؤشّر الزمني في منتصف المقطع الأول [1→4]
    activePlayer!.setTime(2.5)
    expect(activePlayer!.getCurrentTime()).toBe(2.5)

    fireEvent.keyDown(window, { key: '0' })

    // يجب أن يقفز فوراً لبداية المقطع (1.0)
    await waitFor(() => {
      expect(activePlayer!.getCurrentTime()).toBe(1)
    })

    // لا يوجد مؤشر تكرار (0 = إعادة واحدة بلا تكرار)
    expect(screen.queryByText(/\/2|\/3|\/4/)).not.toBeInTheDocument()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('pressing 1/2/3 seeks to scene start and shows the repeat indicator', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadVideoWithSubtitles()

    activePlayer!.setTime(6) // منتصف المقطع الثاني [5→8]

    fireEvent.keyDown(window, { key: '2' })

    // القفز لبداية المقطع الثاني (5.0)
    await waitFor(() => {
      expect(activePlayer!.getCurrentTime()).toBe(5)
    })

    // مؤشر التكرار يظهر بصيغة "1/3" (المرّة الأولى من 3)
    await waitFor(() => {
      expect(screen.getByText('1/3')).toBeInTheDocument()
    })

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('loops back to scene start when the scene ends, decrementing the counter', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadVideoWithSubtitles()

    activePlayer!.setTime(2.5) // منتصف المقطع الأول [1→4]

    fireEvent.keyDown(window, { key: '1' }) // تكرار مرّتين

    await waitFor(() => {
      expect(activePlayer!.getCurrentTime()).toBe(1)
    })
    await waitFor(() => {
      expect(screen.getByText('1/2')).toBeInTheDocument()
    })

    // انتظار دورة استطلاع واحدة على الأقل (200ms) لتصفير علامة "قفزة
    // معلّقة" — فالمحاكي يُنفّذ seekTo فوراً، والاستطلاع الأول يقرأ
    // currentTime=1 (< sceneEnd) فيُثبت استيفاء القفز. دون هذا الانتظار،
    // قد يقفز الاختبار الزمن قبل أن يُصفَّر awaitingSeek فيفشل كشف النهاية
    await new Promise((resolve) => setTimeout(resolve, 350))

    // محاكاة بلوغ نهاية المقطع: ندفع الوقت إلى ما بعد النهاية (4)
    activePlayer!.setTime(4.5)

    // الاستطلاع المشترك يلتقط التغيّر ضمن ~200ms ويقفز لبداية المقطع
    // مع تناقص العدّاد إلى المرّة الثانية من 2
    await waitFor(
      () => {
        expect(activePlayer!.getCurrentTime()).toBe(1)
        expect(screen.getByText('2/2')).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    // انتظار دورة استطلاع أخرى لتصفير علامة القفزة قبل بلوغ النهاية مرة أخرى
    await new Promise((resolve) => setTimeout(resolve, 350))

    // بلوغ النهاية مرة أخرى: العدّاد ينفد، يُلغى التكرار ويستأنف التشغيل الطبيعي
    activePlayer!.setTime(4.5)
    await waitFor(
      () => {
        expect(screen.queryByText('2/2')).not.toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('ignores number shortcuts while typing in a text field', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadVideoWithSubtitles()

    activePlayer!.setTime(2.5)

    const syntheticInput = document.createElement('input')
    syntheticInput.type = 'text'
    document.body.appendChild(syntheticInput)
    syntheticInput.focus()

    fireEvent.keyDown(syntheticInput, { key: '0' })
    fireEvent.keyDown(syntheticInput, { key: '1' })

    // لا قفز ولا مؤشر تكرار — الاختصارات تُتجاهَل أثناء الكتابة
    expect(activePlayer!.getCurrentTime()).toBe(2.5)
    expect(screen.queryByText(/\/2|\/3|\/4/)).not.toBeInTheDocument()

    document.body.removeChild(syntheticInput)
    errorSpy.mockRestore()
  })
})
