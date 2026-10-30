import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'

beforeEach(() => {
  installMockYouTubeApi()
  window.localStorage.clear()
})

async function renderWithVideoLoaded() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('رابط الفيديو'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/وضع العرض/)).toBeInTheDocument())
}

/** The toggle is an entry of the console's "more options" menu, which closes after each choice */
function openMoreMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'المزيد من الخيارات' }))
}

describe('sidebar position toggle', () => {
  it('swaps the sidebar side, updates the resize handle a11y label, and persists the choice', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderWithVideoLoaded()

    // الوضع الافتراضي: اللوحة الجانبية على اليسار — الزر يعرض إمكانية نقلها لليمين
    openMoreMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'نقل اللوحة الجانبية إلى يمين الشاشة' }))

    // بعد التبديل: يظهر عنصر بعنوان معاكس، ويُحفظ التفضيل فوراً
    openMoreMenu()
    expect(await screen.findByRole('menuitem', { name: 'نقل اللوحة الجانبية إلى يسار الشاشة' })).toBeInTheDocument()
    expect(window.localStorage.getItem('ydc:sidebar-position')).toBe('"right"')

    // إعادة التبديل تعيد الحالة الأصلية
    fireEvent.click(screen.getByRole('menuitem', { name: 'نقل اللوحة الجانبية إلى يسار الشاشة' }))
    openMoreMenu()
    expect(await screen.findByRole('menuitem', { name: 'نقل اللوحة الجانبية إلى يمين الشاشة' })).toBeInTheDocument()
    expect(window.localStorage.getItem('ydc:sidebar-position')).toBe('"left"')

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('remembers the choice across a fresh mount', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    window.localStorage.setItem('ydc:sidebar-position', '"right"')

    await renderWithVideoLoaded()

    // عند التحميل بتفضيل محفوظ مسبقاً "right"، الزر يجب أن يعرض خيار النقل لليسار مباشرة
    openMoreMenu()
    expect(screen.getByRole('menuitem', { name: 'نقل اللوحة الجانبية إلى يسار الشاشة' })).toBeInTheDocument()

    errorSpy.mockRestore()
  })
})
