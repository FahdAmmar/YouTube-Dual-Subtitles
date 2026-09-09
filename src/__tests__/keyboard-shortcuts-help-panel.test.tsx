import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'

beforeEach(() => {
  installMockYouTubeApi()
})

async function loadVideo() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
}

describe('keyboard shortcuts help panel', () => {
  it('opens via the console button, traps focus, and returns focus to the trigger on close', async () => {
    const user = userEvent.setup()
    await loadVideo()

    const openButton = screen.getByLabelText('عرض اختصارات لوحة المفاتيح')
    await user.click(openButton)

    const dialog = await screen.findByRole('dialog', { name: 'اختصارات لوحة المفاتيح' })
    await waitFor(() => expect(dialog).toHaveFocus())

    // عيّنة من محتوى اللوحة يجب أن تظهر (لا حاجة لسرد كل الاختصارات)
    expect(screen.getByText('تشغيل/إيقاف مؤقت')).toBeInTheDocument()

    await user.click(screen.getByLabelText('إغلاق لوحة الاختصارات'))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'اختصارات لوحة المفاتيح' })).not.toBeInTheDocument()
    })
    expect(openButton).toHaveFocus()
  })

  it('opens via the "?" shortcut and closes on Escape', async () => {
    await loadVideo()

    fireEvent.keyDown(window, { key: '?' })

    await screen.findByRole('dialog', { name: 'اختصارات لوحة المفاتيح' })

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'اختصارات لوحة المفاتيح' })).not.toBeInTheDocument()
    })
  })

  it('does not open the "?" shortcut while an input element has focus', async () => {
    await loadVideo()

    // أي عنصر <input> يُعامَل كهدف كتابة (انظر isTypingTarget)، بغض النظر
    // عن نوعه — هنا حقل رفع الملف كمثال متاح فعلياً بعد تحميل الفيديو
    const fileInput = screen.getByLabelText('رفع ملف ترجمة العربية')
    fireEvent.keyDown(fileInput, { key: '?' })

    expect(screen.queryByRole('dialog', { name: 'اختصارات لوحة المفاتيح' })).not.toBeInTheDocument()
  })
})
