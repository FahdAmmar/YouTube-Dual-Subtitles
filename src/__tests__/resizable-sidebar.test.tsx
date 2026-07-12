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
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
}

describe('resizable sidebar handle', () => {
  it('resizes via keyboard, resets via double-click, and persists to localStorage', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await renderWithVideoLoaded()

    const handle = screen.getByRole('separator', { name: /تغيير عرض اللوحة الجانبية/ })
    const initialWidth = Number(handle.getAttribute('aria-valuenow'))
    expect(initialWidth).toBeGreaterThan(0)

    // توسيع بمفتاح السهم الأيمن (يقابل سحب المقبض فعلياً نحو اليمين)
    handle.focus()
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    await waitFor(() => {
      expect(Number(handle.getAttribute('aria-valuenow'))).toBeGreaterThan(initialWidth)
    })
    const expandedWidth = Number(handle.getAttribute('aria-valuenow'))

    // تُحفَظ القيمة فوراً في localStorage عند كل تعديل من لوحة المفاتيح
    await waitFor(() => {
      expect(window.localStorage.getItem('dual-subtitles:sidebar-width')).toBe(String(expandedWidth))
    })

    // تصغير بمفتاح السهم الأيسر
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    await waitFor(() => {
      expect(Number(handle.getAttribute('aria-valuenow'))).toBeLessThan(expandedWidth)
    })

    // Home يذهب للحد الأدنى (300px كما هو مضبوط في AppShell)
    fireEvent.keyDown(handle, { key: 'Home' })
    await waitFor(() => {
      expect(Number(handle.getAttribute('aria-valuenow'))).toBe(300)
    })

    // نقرة مزدوجة تُعيد العرض الافتراضي (380px)
    fireEvent.doubleClick(handle)
    await waitFor(() => {
      expect(Number(handle.getAttribute('aria-valuenow'))).toBe(380)
    })

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('resizes via pointer drag and shows the drag overlay while dragging', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await renderWithVideoLoaded()

    const handle = screen.getByRole('separator', { name: /تغيير عرض اللوحة الجانبية/ })
    const initialWidth = Number(handle.getAttribute('aria-valuenow'))

    fireEvent.pointerDown(handle, { clientX: 500, button: 0, pointerType: 'mouse' })

    // الغطاء الشفاف يظهر أثناء السحب فقط (يمنع إطار الفيديو من ابتلاع الأحداث)
    expect(document.querySelector('.cursor-col-resize.fixed')).toBeInTheDocument()

    // في الاتجاه RTL الحالي، السحب نحو اليمين (زيادة clientX) يوسّع اللوحة
    fireEvent(window, new PointerEvent('pointermove', { clientX: 560, bubbles: true }))
    await waitFor(() => {
      expect(Number(handle.getAttribute('aria-valuenow'))).toBeGreaterThan(initialWidth)
    })

    fireEvent(window, new PointerEvent('pointerup', { clientX: 560, bubbles: true }))

    await waitFor(() => {
      expect(document.querySelector('.cursor-col-resize.fixed')).not.toBeInTheDocument()
    })

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })
})
