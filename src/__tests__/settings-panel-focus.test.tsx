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

// نمط حوار قياسي (WAI-ARIA Dialog Pattern) — كان غائباً بالكامل عن لوحة
// الإعدادات: لا انتقال تركيز عند الفتح، لا إغلاق بـ Escape، لا إعادة تركيز
// عند الإغلاق. هذه الاختبارات تُثبّت السلوك الصحيح بعد الإصلاح.
//
// تُستخدم userEvent هنا بدل fireEvent تحديداً لأن fireEvent.click لا يُحاكي
// سلوك التركيز الطبيعي للمتصفح عند النقر (وهو ما تعتمد عليه هذه الاختبارات)،
// بينما userEvent يُحاكي تسلسل التفاعل الكامل (focus ثم click) كما يحدث فعلياً
describe('settings panel focus management', () => {
  it('moves focus into the dialog on open', async () => {
    const user = userEvent.setup()
    await loadVideo()

    await user.click(screen.getByLabelText('فتح إعدادات حجم ولون الترجمة'))

    const dialog = await screen.findByRole('dialog', { name: 'إعدادات عرض الترجمة' })

    await waitFor(() => {
      expect(dialog).toHaveFocus()
    })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('closes on Escape and returns focus to the trigger button', async () => {
    const user = userEvent.setup()
    await loadVideo()

    const openButton = screen.getByLabelText('فتح إعدادات حجم ولون الترجمة')
    await user.click(openButton)

    const dialog = await screen.findByRole('dialog', { name: 'إعدادات عرض الترجمة' })
    await waitFor(() => expect(dialog).toHaveFocus())

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'إعدادات عرض الترجمة' })).not.toBeInTheDocument()
    })
    expect(openButton).toHaveFocus()
  })

  it('returns focus to the trigger button when closed via the close icon', async () => {
    const user = userEvent.setup()
    await loadVideo()

    const openButton = screen.getByLabelText('فتح إعدادات حجم ولون الترجمة')
    await user.click(openButton)

    await screen.findByRole('dialog', { name: 'إعدادات عرض الترجمة' })
    await user.click(screen.getByLabelText('إغلاق لوحة الإعدادات'))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'إعدادات عرض الترجمة' })).not.toBeInTheDocument()
    })
    expect(openButton).toHaveFocus()
  })
})
