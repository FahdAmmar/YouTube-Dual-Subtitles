import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'

beforeEach(() => {
  installMockYouTubeApi()
})

async function renderWithVideoLoaded() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
}

describe('video keyboard shortcuts', () => {
  it('space toggles play/pause', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderWithVideoLoaded()

    // في البداية: الفيديو جاهز لكن غير مُشغَّل بعد
    expect(screen.getByRole('button', { name: 'تشغيل' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: ' ' })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'إيقاف مؤقت' })).toBeInTheDocument()
    })

    fireEvent.keyDown(window, { key: ' ' })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'تشغيل' })).toBeInTheDocument()
    })

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('c speeds up and x slows down, clamped within [0.25x, 2x]', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderWithVideoLoaded()

    const rateButton = screen.getByRole('button', { name: /سرعة التشغيل الحالية/ })
    expect(rateButton).toHaveTextContent('1×')

    fireEvent.keyDown(window, { key: 'c' })
    await waitFor(() => expect(rateButton).toHaveTextContent('1.5×'))

    fireEvent.keyDown(window, { key: 'c' })
    await waitFor(() => expect(rateButton).toHaveTextContent('2×'))

    // يجب أن يبقى عند الحد الأقصى 2× ولا يتجاوزه
    fireEvent.keyDown(window, { key: 'c' })
    await waitFor(() => expect(rateButton).toHaveTextContent('2×'))

    fireEvent.keyDown(window, { key: 'x' })
    fireEvent.keyDown(window, { key: 'x' })
    fireEvent.keyDown(window, { key: 'x' })
    fireEvent.keyDown(window, { key: 'x' })
    fireEvent.keyDown(window, { key: 'x' })
    fireEvent.keyDown(window, { key: 'x' })
    // 2 → 1.5 → 1 → 0.5 → 0 (يُحدّ إلى 0.25) → يبقى عند 0.25×
    await waitFor(() => expect(rateButton).toHaveTextContent('0.25×'))

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('ignores shortcuts while typing in a text field', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderWithVideoLoaded()

    const rateButton = screen.getByRole('button', { name: /سرعة التشغيل الحالية/ })
    expect(rateButton).toHaveTextContent('1×')

    const syntheticInput = document.createElement('input')
    syntheticInput.type = 'text'
    document.body.appendChild(syntheticInput)
    syntheticInput.focus()

    fireEvent.keyDown(syntheticInput, { key: 'c' })
    fireEvent.keyDown(syntheticInput, { key: ' ' })

    // لا تغيير: لا في السرعة ولا في حالة التشغيل
    expect(rateButton).toHaveTextContent('1×')
    expect(screen.getByRole('button', { name: 'تشغيل' })).toBeInTheDocument()

    document.body.removeChild(syntheticInput)
    errorSpy.mockRestore()
  })

  it('ignores shortcuts when a modifier key is held (e.g. Ctrl+C for copy)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderWithVideoLoaded()

    const rateButton = screen.getByRole('button', { name: /سرعة التشغيل الحالية/ })
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true })
    expect(rateButton).toHaveTextContent('1×')

    errorSpy.mockRestore()
  })

  it('f triggers the fullscreen toggle without crashing (jsdom has no real Fullscreen API)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderWithVideoLoaded()

    fireEvent.keyDown(window, { key: 'f' })

    // العنصر المهم هنا: عدم انهيار التطبيق حتى في بيئة لا تدعم
    // Fullscreen API فعلياً (المسار الدفاعي في useFullscreen يتولى ذلك)
    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('is also controllable via the clickable rate menu in the control bar', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderWithVideoLoaded()

    const rateButton = screen.getByRole('button', { name: /سرعة التشغيل الحالية/ })
    fireEvent.click(rateButton)

    const menu = await screen.findByRole('menu', { name: 'اختيار سرعة التشغيل' })
    fireEvent.click(within(menu).getByText('1.75×'))

    await waitFor(() => expect(rateButton).toHaveTextContent('1.75×'))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    errorSpy.mockRestore()
  })
})
