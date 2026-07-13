import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi, type MockYouTubePlayer } from './testHelpers/mockYouTubePlayer'

let activePlayer: MockYouTubePlayer | null = null
let originalGetBoundingClientRect: typeof Element.prototype.getBoundingClientRect

function makeRect(rect: { top: number; left: number; width: number; height: number }): DOMRect {
  return {
    ...rect,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    x: rect.left,
    y: rect.top,
    toJSON() {
      return this
    },
  } as DOMRect
}

beforeEach(() => {
  activePlayer = null
  installMockYouTubeApi((player) => {
    activePlayer = player
  })

  // نميّز حجم/موضع فقاعة الترجمة القابلة للسحب (صغيرة، متمركزة تقريباً)
  // عن حجم/موضع حاوية الفيديو الكاملة (كبيرة) — بخلاف المحاكاة العامة في
  // setup.ts التي تُعيد نفس المستطيل لكل عنصر، وهو غير كافٍ لاختبار منطق
  // تقييد السحب ضمن الحدود هنا تحديداً
  originalGetBoundingClientRect = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (this.getAttribute('data-testid') === 'draggable-subtitle-overlay') {
      return makeRect({ top: 700, left: 490, width: 300, height: 60 })
    }
    return makeRect({ top: 0, left: 0, width: 1280, height: 800 })
  }
})

afterEach(() => {
  Element.prototype.getBoundingClientRect = originalGetBoundingClientRect
})

function makeFile(name: string, content: string) {
  return new File([content], name, { type: 'text/plain' })
}

const SRT = `1
00:00:00,000 --> 00:00:10,000
مرحباً بكم
`

async function renderWithActiveCaption() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

  const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>
  await fireEvent.change(fileInputs[0]!, { target: { files: [makeFile('ar.srt', SRT)] } })
  await fireEvent.change(fileInputs[1]!, { target: { files: [makeFile('en.srt', SRT)] } })

  expect(activePlayer).not.toBeNull()
  activePlayer!.setTime(2)
  fireEvent.click(screen.getByRole('button', { name: 'تشغيل' }))

  return screen.findByTestId('draggable-subtitle-overlay')
}

describe('draggable subtitle overlay', () => {
  it('drags within bounds, clamps at the video edges, and persists the position', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const overlay = await renderWithActiveCaption()

    expect(overlay.style.transform).toBe('translate(0px, 0px)')

    // سحب معتدل ضمن الحدود المسموحة تماماً (الحد الأقصى المحسوب هنا: X≈490، Y بين -700 و40)
    fireEvent.pointerDown(overlay, { clientX: 640, clientY: 730, button: 0, pointerType: 'mouse' })
    fireEvent(window, new PointerEvent('pointermove', { clientX: 740, clientY: 700, bubbles: true }))
    fireEvent(window, new PointerEvent('pointerup', { clientX: 740, clientY: 700, bubbles: true }))

    await waitFor(() => {
      expect(overlay.style.transform).toBe('translate(100px, -30px)')
    })

    // تُحفظ الإزاحة في localStorage عند انتهاء السحب
    const stored = JSON.parse(window.localStorage.getItem('ydc:subtitle-overlay-position') ?? '{}')
    expect(stored.xPercent).toBeCloseTo((100 / 1280) * 100, 5)
    expect(stored.yPercent).toBeCloseTo((-30 / 800) * 100, 5)

    // سحب كبير جداً يتجاوز حافة الفيديو يجب أن يُقيَّد عند الحد الأقصى (490px يميناً من الموضع الأصلي)
    fireEvent.pointerDown(overlay, { clientX: 640, clientY: 730, button: 0, pointerType: 'mouse' })
    fireEvent(window, new PointerEvent('pointermove', { clientX: 5000, clientY: 730, bubbles: true }))
    fireEvent(window, new PointerEvent('pointerup', { clientX: 5000, clientY: 730, bubbles: true }))

    await waitFor(() => {
      // الإزاحة الابتدائية لهذا السحب كانت 100px (من السحب السابق) + أقصى دلتا مسموحة 490px = 590px
      expect(overlay.style.transform).toBe('translate(590px, -30px)')
    })

    // نقرة مزدوجة تُعيد الترجمة إلى موضعها الافتراضي تماماً
    fireEvent.doubleClick(overlay)
    await waitFor(() => {
      expect(overlay.style.transform).toBe('translate(0px, 0px)')
    })
    const resetStored = JSON.parse(window.localStorage.getItem('ydc:subtitle-overlay-position') ?? '{}')
    expect(resetStored).toEqual({ xPercent: 0, yPercent: 0 })

    expect(screen.queryByText('حدث خطأ غير متوقع')).not.toBeInTheDocument()
    errorSpy.mockRestore()
  })
})
