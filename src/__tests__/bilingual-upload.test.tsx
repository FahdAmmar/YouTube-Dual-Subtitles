import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'

beforeEach(() => {
  installMockYouTubeApi()
})

function makeFile(name: string, content: string) {
  return new File([content], name, { type: 'text/plain' })
}

// ملف SRT ثنائي اللغة: كل مقطع يحوي سطر العربية ثم سطر الإنجليزية
// — مطابق للصيغة التي يُصدّرها التطبيق نفسه عبر pairedSlicesToSrt
const BILINGUAL_SRT = `1
00:00:01,000 --> 00:00:04,000
مرحباً بكم في هذا الفيديو
Welcome to this video

2
00:00:05,000 --> 00:00:08,000
هذا مثال على الترجمة
This is an example of the translation
`

describe('bilingual subtitle upload', () => {
  it('splits a single bilingual SRT into both tracks and shows both in the transcript', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))

    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    // رفع ملف واحد ثنائي اللغة — يُفترض أن يملأ المسارين معاً
    await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة ثنائي اللغة'), {
      target: { files: [makeFile('bilingual.srt', BILINGUAL_SRT)] },
    })

    // اسم الملف يظهر في ثلاثة أماكن معاً بحالة نجاح: صف الرفع الثنائي،
    // وصفّا المسارين المنفصلين (loadCues يُسجّل نفس الاسم على الاثنين
    // عمداً — انظر التعليق في useSubtitleTrack.loadCues). يجب أن يبقى
    // ظاهراً فوراً بعد الرفع، قبل الطي التلقائي المؤجَّل
    await waitFor(() => {
      expect(screen.getAllByText('bilingual.srt')).toHaveLength(3)
    })

    // يبقى ظاهراً بعد مهلة قصيرة أيضاً (قبل أن يبدأ الطي التلقائي المؤجَّل)
    expect(screen.getAllByText('bilingual.srt')).toHaveLength(3)

    // النص العربي (المصدر) يظهر في لوحة النص المتزامن
    await waitFor(() => {
      expect(screen.getByText('مرحباً بكم في هذا الفيديو')).toBeInTheDocument()
      expect(screen.getByText('هذا مثال على الترجمة')).toBeInTheDocument()
    })

    // النص الإنجليزي (الترجمة) يظهر أيضاً في نفس اللوحة — كلا المسارين مُعبّآن
    await waitFor(() => {
      expect(screen.getByText('Welcome to this video')).toBeInTheDocument()
      expect(screen.getByText('This is an example of the translation')).toBeInTheDocument()
    })

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('keeps the success confirmation visible before collapsing the upload section', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))

    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    // رفع ملف ثنائي اللغة يُجهّز كلا المسارين في نفس اللحظة تماماً — هذا
    // بالضبط السيناريو الذي كان يُسبّب طياً فورياً يُخفي التأكيد قبل ظهوره
    await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة ثنائي اللغة'), {
      target: { files: [makeFile('bilingual.srt', BILINGUAL_SRT)] },
    })

    // التأكيد ظاهر فوراً (في أماكنه الثلاثة) — القسم لم يُطوَ بعد
    await waitFor(() => {
      expect(screen.getAllByText('bilingual.srt')).toHaveLength(3)
    })
    expect(screen.getByRole('radiogroup', { name: 'وضع عرض الترجمة' })).toBeInTheDocument()

    // بعد المهلة المتعمَّدة: يُطوى القسم تلقائياً كالمعتاد (السلوك الأصلي
    // لم يُلغَ، فقط أُجِّل قليلاً)
    await waitFor(
      () => {
        expect(screen.queryByRole('radiogroup', { name: 'وضع عرض الترجمة' })).not.toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('reports an error for an empty bilingual file', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))

    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة ثنائي اللغة'), {
      target: { files: [makeFile('empty.srt', '   \n\n  ')] },
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })
})
