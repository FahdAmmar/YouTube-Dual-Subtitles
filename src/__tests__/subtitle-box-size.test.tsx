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

const SOURCE_SRT = `1\n00:00:01,000 --> 00:00:08,000\nمرحباً بكم في هذا الفيديو\n`
const TRANSLATION_SRT = `1\n00:00:01,000 --> 00:00:08,000\nWelcome to this video\n`

describe('subtitle box width and line-height settings', () => {
  it('applies the width and line-height sliders to the burned-in subtitle overlay', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

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
      expect(screen.getByText('ar.srt')).toBeInTheDocument()
      expect(screen.getByText('en.srt')).toBeInTheDocument()
    })

    // فتح لوحة الإعدادات وتعديل عرض الصندوق وتباعد الأسطر إلى قيمتين مغايرتين للافتراضي
    fireEvent.click(screen.getByLabelText('فتح إعدادات حجم ولون الترجمة'))
    const widthSlider = await screen.findByLabelText('عرض الصندوق')
    const lineHeightSlider = screen.getByLabelText('تباعد الأسطر')
    fireEvent.change(widthSlider, { target: { value: '60' } })
    fireEvent.change(lineHeightSlider, { target: { value: '1.6' } })
    fireEvent.keyDown(document, { key: 'Escape' })

    // تشغيل الفيديو عند لحظة ضمن المقطع المرفوع كي تظهر الترجمة المحروقة فوق الفيديو
    expect(activePlayer).not.toBeNull()
    activePlayer!.setTime(2)
    fireEvent.click(screen.getByRole('button', { name: 'تشغيل' }))

    const overlay = await screen.findByTestId('draggable-subtitle-overlay')
    const translationLine = await within(overlay).findByText('Welcome to this video')
    const sourceLine = within(overlay).getByText('مرحباً بكم في هذا الفيديو')

    expect(translationLine.style.maxWidth).toBe('60%')
    expect(translationLine.style.lineHeight).toBe('1.6')
    expect(sourceLine.style.lineHeight).toBe('1.6')
    // السطر المرجعي (العربي) يبقى أضيق قليلاً من السطر الأساسي، بنفس
    // النسبة المتّبعة سابقاً كقيم ثابتة (88% مقابل 94%)
    expect(Number.parseFloat(sourceLine.style.maxWidth)).toBeLessThan(60)

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })
})
