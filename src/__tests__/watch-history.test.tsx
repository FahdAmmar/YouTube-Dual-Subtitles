import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'
import { resetIndexedDb } from './testHelpers/resetIndexedDb'
import { getSubtitleContent, saveSubtitleContent } from '@/lib/utils/subtitleContentStore'

const VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const SOURCE_SRT = `1\n00:00:01,000 --> 00:00:04,000\nمرحباً\n`

function makeSubtitleFile(name: string, content: string) {
  return new File([content], name, { type: 'text/plain' })
}

function makeVideoFile(name: string, type: string) {
  return new File(['fake video bytes'], name, { type })
}

/** محاكاة عنصر <video> جاهزاً — jsdom لا يُنفّذ فك ترميز فيديو حقيقياً فلن يُطلق loadedmetadata من تلقاء نفسه */
function simulateVideoReady(video: HTMLVideoElement, duration = 120) {
  Object.defineProperty(video, 'duration', { value: duration, configurable: true })
  fireEvent(video, new Event('loadedmetadata'))
}

beforeEach(() => {
  installMockYouTubeApi()
  resetIndexedDb()
})

afterEach(() => {
  window.localStorage.clear()
})

async function loadYoutubeVideo() {
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), { target: { value: VIDEO_URL } })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
}

function goBackToPickerScreen() {
  fireEvent.click(screen.getByRole('button', { name: /CHANGE_VIDEO/ }))
}

/**
 * زر تحديد المُدخل التاريخي هو أول عنصر مطابق دوماً — الثاني (إن وُجد)
 * هو زر الإزالة، الذي يشارك جزءاً من نفس النص ضمن aria-label الخاص به
 * ("إزالة {الاسم} من السجل")، فيتطابق أيضاً مع نفس النمط النصي
 */
async function findHistorySelectButton(namePattern: RegExp): Promise<HTMLElement> {
  const buttons = await screen.findAllByRole('button', { name: namePattern })
  const [button] = buttons
  if (!button) throw new Error(`No history button found matching ${String(namePattern)}`)
  return button
}

describe('watch history', () => {
  it('records a YouTube visit and resumes it with one click from history', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    await loadYoutubeVideo()
    goBackToPickerScreen()

    const historyButton = await findHistorySelectButton(/فيديو تجريبي للاختبار/)
    // صورة مصغّرة حقيقية من يوتيوب، لا أيقونة عامة
    expect(historyButton.querySelector('img')).toBeInTheDocument()

    fireEvent.click(historyButton)
    // نقرة واحدة كافية — لا شاشة وسيطة ولا حاجة لإدخال الرابط يدوياً
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('reminds (but cannot auto-load) a local video, switching to the file tab with the exact name', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    fireEvent.click(screen.getByRole('radio', { name: '[ ملف من جهازي ]' }))
    fireEvent.change(screen.getByLabelText('اختيار ملف فيديو محلي'), {
      target: { files: [makeVideoFile('lecture.mp4', 'video/mp4')] },
    })
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
    simulateVideoReady(document.querySelector('video') as HTMLVideoElement)
    goBackToPickerScreen()

    const historyButton = await findHistorySelectButton(/lecture\.mp4/)
    fireEvent.click(historyButton)

    // يبقى على شاشة الاختيار (لا تحميل تلقائي)، مع تبديل تلقائي لتبويب
    // الملف وتذكير واضح باسم الملف المطلوب
    expect(screen.queryByText(/DISPLAY_MODE/)).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '[ ملف من جهازي ]' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('lecture.mp4', { selector: 'span.font-mono' })).toBeInTheDocument()

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('shows a subtitle-file reminder when revisiting a video whose content was never saved (fallback path)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    await loadYoutubeVideo()
    await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), {
      target: { files: [makeSubtitleFile('ar.srt', SOURCE_SRT)] },
    })
    await waitFor(() => expect(screen.getByText('ar.srt')).toBeInTheDocument())
    // نمحو محتوى IndexedDB المحفوظ خلف الكواليس عمداً لمحاكاة حالة تعذّر
    // الاستعادة (متصفح قديم، أو حصة ممتلئة) — يجب أن يبقى التذكير النصي
    // خطة بديلة تعمل بصمت في هذه الحالة، لا أن يتعطّل التطبيق
    resetIndexedDb()
    goBackToPickerScreen()

    const historyButton = await findHistorySelectButton(/فيديو تجريبي للاختبار/)
    fireEvent.click(historyButton)
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
    // الترجمة لم تُرفع بعد في هذه الجلسة الجديدة، ولا محتوى محفوظاً
    // لاستعادتها تلقائياً — يجب أن يظهر تذكير باسمها بدل الرسالة العامة
    await waitFor(() => expect(screen.getByText('أعد رفع: ar.srt')).toBeInTheDocument())

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('auto-activates the subtitle content itself (not just a reminder) when revisiting the same video', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)
    await loadYoutubeVideo()
    await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), {
      target: { files: [makeSubtitleFile('ar.srt', SOURCE_SRT)] },
    })
    await waitFor(() => expect(screen.getByText('ar.srt')).toBeInTheDocument())

    // نتأكد أن الحفظ الخلفي (fire-and-forget) في IndexedDB اكتمل فعلاً
    // قبل المتابعة، بدل الاعتماد على توقيت غير مضمون
    await waitFor(async () => {
      const content = await getSubtitleContent('youtube:dQw4w9WgXcQ', 'source', 'ar.srt')
      expect(content).not.toBeNull()
    })

    goBackToPickerScreen()
    const historyButton = await findHistorySelectButton(/فيديو تجريبي للاختبار/)
    fireEvent.click(historyButton)
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    // الترجمة تُفعَّل تلقائياً بالكامل — بلا أي نقرة رفع إضافية، وبلا
    // ظهور رسالة التذكير إطلاقاً (لأن المحتوى استُعيد فعلياً، لا مجرد اسمه)
    await waitFor(() => expect(screen.getByText('ar.srt')).toBeInTheDocument())
    expect(screen.queryByText('أعد رفع: ar.srt')).not.toBeInTheDocument()
    // والأهم: النص المُفرَّغ الفعلي من الملف المُستعاد ظاهر في لوحة النص —
    // إثبات أن المقاطع (cues) عملية فعلاً، لا مجرد حالة "جاهز" شكلية
    await waitFor(() => expect(screen.getByText('مرحباً')).toBeInTheDocument())

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('removes a single entry from history', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<App />)
    await loadYoutubeVideo()
    goBackToPickerScreen()

    const removeButton = await screen.findByLabelText(/إزالة .* من السجل/)
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /فيديو تجريبي للاختبار/ })).toHaveLength(0)
    })

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('removing a history entry also cleans up its progress, sync-offset, and subtitle-content data', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const videoKey = 'youtube:dQw4w9WgXcQ'

    render(<App />)
    await loadYoutubeVideo()
    goBackToPickerScreen()

    // نزرع بيانات في المخازن الثلاثة الأخرى مباشرة — أسرع وأدقّ من محاكاة
    // المؤقّت الدوري الحقيقي (4 ثوانٍ) أو تفاعل واجهة كامل لكل مخزن
    window.localStorage.setItem(
      'ydc:video-progress',
      JSON.stringify({ [videoKey]: { time: 42, duration: 120, savedAt: Date.now() } }),
    )
    window.localStorage.setItem('ydc:sync-offsets', JSON.stringify({ [`${videoKey}::source::ar.srt`]: 1.5 }))
    await saveSubtitleContent(videoKey, 'source', 'ar.srt', 'SOME_CONTENT')
    await waitFor(async () => {
      expect(await getSubtitleContent(videoKey, 'source', 'ar.srt')).toBe('SOME_CONTENT')
    })

    const removeButton = await screen.findByLabelText(/إزالة .* من السجل/)
    fireEvent.click(removeButton)

    await waitFor(() => {
      const progressMap: Record<string, unknown> = JSON.parse(window.localStorage.getItem('ydc:video-progress') ?? '{}')
      expect(progressMap[videoKey]).toBeUndefined()
    })
    const offsetMap: Record<string, unknown> = JSON.parse(window.localStorage.getItem('ydc:sync-offsets') ?? '{}')
    expect(offsetMap[`${videoKey}::source::ar.srt`]).toBeUndefined()
    await waitFor(async () => {
      expect(await getSubtitleContent(videoKey, 'source', 'ar.srt')).toBeNull()
    })

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })
})
