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

const SRT = `1
00:00:01,000 --> 00:00:04,000
نص تجريبي

2
00:00:05,000 --> 00:00:08,000
نص تجريبي آخر
`

describe('collapsible upload section', () => {
  it('auto-collapses once both tracks are ready, and can be re-expanded manually', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))

    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

    // قبل رفع أي ملف: القسم موسّع، أزرار وضع العرض ظاهرة
    expect(screen.getByRole('radiogroup', { name: 'وضع عرض الترجمة' })).toBeInTheDocument()

    const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>
    expect(fileInputs.length).toBe(3)

    await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), {
      target: { files: [makeFile('ar.srt', SRT)] },
    })
    await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة الإنجليزية'), {
      target: { files: [makeFile('en.srt', SRT)] },
    })

    // بعد جهوزية الملفين: يُطوى القسم تلقائياً — أزرار وضع العرض تختفي
    await waitFor(() => {
      expect(screen.queryByRole('radiogroup', { name: 'وضع عرض الترجمة' })).not.toBeInTheDocument()
    })

    // الصف الموجز يظهر بدلاً منه ويحوي زر التوسيع
    const expandButton = screen.getByRole('button', { name: /UPLOAD_SETTINGS/ })
    expect(expandButton).toBeInTheDocument()

    // إعادة التوسيع يدوياً تُعيد إظهار أزرار وضع العرض
    fireEvent.click(expandButton)
    await waitFor(() => {
      expect(screen.getByRole('radiogroup', { name: 'وضع عرض الترجمة' })).toBeInTheDocument()
    })

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })
})
