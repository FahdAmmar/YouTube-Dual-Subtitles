import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

// محاكاة بيئة لا توفر window.matchMedia إطلاقاً (متصفح مضمّن/iframe مقيّد)
// هذا يحاكي بالضبط البيئة التي كانت تسبب شاشة "حدث خطأ غير متوقع"
describe('crash fix verification: missing window.matchMedia', () => {
  const original = window.matchMedia

  beforeEach(() => {
    // @ts-expect-error - إزالة الدالة عمداً لمحاكاة بيئة لا توفرها
    delete window.matchMedia
  })

  afterEach(() => {
    window.matchMedia = original
  })

  it('does NOT crash to the ErrorBoundary fallback when matchMedia is unavailable', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<App />)

    // يجب أن تظهر الشاشة الرئيسية الطبيعية، وليس شاشة الخطأ
    expect(screen.getByText('مترجم يوتيوب المزدوج')).toBeInTheDocument()
    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()

    errorSpy.mockRestore()
  })
})
