import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi, type MockYouTubePlayer } from './testHelpers/mockYouTubePlayer'

const LAYOUT_KEY = 'ydc:subtitle-layout'
const SOURCE_SRT = `1\n00:00:00,000 --> 00:00:10,000\nمرحباً بكم\n`
const TRANSLATION_SRT = `1\n00:00:00,000 --> 00:00:10,000\nHello world\n`
const MYMEMORY_RESPONSE = { responseStatus: 200, responseData: { translatedText: 'عالم' }, matches: [] }

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
  window.localStorage.clear()
  installMockYouTubeApi((player) => {
    activePlayer = player
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) =>
      String(input).includes('wiktionary')
        ? { ok: false, status: 404, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => MYMEMORY_RESPONSE },
    ),
  )

  // A small subtitle line inside a large stage: the global mock in setup.ts returns one rect for everything,
  // which can't exercise clamping to the video edges
  originalGetBoundingClientRect = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (this.getAttribute('data-testid')?.startsWith('subtitle-line-')) {
      return makeRect({ top: 700, left: 490, width: 300, height: 60 })
    }
    return makeRect({ top: 0, left: 0, width: 1280, height: 800 })
  }
})

afterEach(() => {
  Element.prototype.getBoundingClientRect = originalGetBoundingClientRect
  vi.unstubAllGlobals()
})

function makeFile(name: string, content: string) {
  return new File([content], name, { type: 'text/plain' })
}

async function renderWithActiveCaption() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

  fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), {
    target: { files: [makeFile('ar.srt', SOURCE_SRT)] },
  })
  fireEvent.change(screen.getByLabelText('رفع ملف ترجمة الإنجليزية'), {
    target: { files: [makeFile('en.srt', TRANSLATION_SRT)] },
  })

  expect(activePlayer).not.toBeNull()
  activePlayer!.setTime(2)
  fireEvent.click(screen.getByRole('button', { name: 'تشغيل' }))
  await screen.findByTestId('subtitle-line-translation')
}

function drag(element: HTMLElement, from: { x: number; y: number }, to: { x: number; y: number }) {
  fireEvent.pointerDown(element, { clientX: from.x, clientY: from.y, button: 0, pointerType: 'mouse' })
  fireEvent(window, new PointerEvent('pointermove', { clientX: to.x, clientY: to.y, bubbles: true }))
  fireEvent(window, new PointerEvent('pointerup', { clientX: to.x, clientY: to.y, bubbles: true }))
}

function storedLayout() {
  return JSON.parse(window.localStorage.getItem(LAYOUT_KEY) ?? '{}')
}

describe('subtitle lines on the video', () => {
  it('drags each language line on its own, clamps at the video edges and saves the layout', async () => {
    await renderWithActiveCaption()
    const source = screen.getByTestId('subtitle-line-source')
    const translation = screen.getByTestId('subtitle-line-translation')
    expect(translation.style.transform).toBe('translate(0px, 0px)')

    drag(translation, { x: 640, y: 730 }, { x: 740, y: 700 })

    await waitFor(() => expect(translation.style.transform).toBe('translate(100px, -30px)'))
    expect(source.style.transform).toBe('translate(0px, 0px)')
    expect(storedLayout().translation.xPercent).toBeCloseTo((100 / 1280) * 100, 5)
    expect(storedLayout().translation.yPercent).toBeCloseTo((-30 / 800) * 100, 5)
    expect(storedLayout().source).toEqual({ xPercent: 0, yPercent: 0 })

    // A huge drag stops at the right edge: the line may move 490px from where it sits, on top of the 100px already applied
    drag(translation, { x: 640, y: 730 }, { x: 5000, y: 730 })
    await waitFor(() => expect(translation.style.transform).toBe('translate(590px, -30px)'))
  })

  it('returns only the double-clicked line to its default spot', async () => {
    await renderWithActiveCaption()
    const source = screen.getByTestId('subtitle-line-source')
    const translation = screen.getByTestId('subtitle-line-translation')
    drag(source, { x: 640, y: 730 }, { x: 540, y: 730 })
    drag(translation, { x: 640, y: 730 }, { x: 740, y: 730 })
    await waitFor(() => expect(translation.style.transform).toBe('translate(100px, 0px)'))
    expect(source.style.transform).toBe('translate(-100px, 0px)')

    fireEvent.doubleClick(translation)

    await waitFor(() => expect(translation.style.transform).toBe('translate(0px, 0px)'))
    expect(source.style.transform).toBe('translate(-100px, 0px)')
  })

  it('moves the whole block between bottom, middle and top and clears manual offsets', async () => {
    await renderWithActiveCaption()
    const translation = screen.getByTestId('subtitle-line-translation')
    const block = () => screen.getByTestId('subtitle-line-translation').parentElement!
    drag(translation, { x: 640, y: 730 }, { x: 740, y: 700 })
    await waitFor(() => expect(translation.style.transform).toBe('translate(100px, -30px)'))
    expect(block().className).toContain('bottom-[4.5rem]')

    fireEvent.click(screen.getByRole('button', { name: /موضع الترجمة: أسفل الفيديو/ }))
    await waitFor(() => expect(block().className).toContain('top-1/2'))
    expect(screen.getByTestId('subtitle-line-translation').style.transform).toBe('translate(0px, 0px)')

    fireEvent.click(screen.getByRole('button', { name: /موضع الترجمة: منتصف الفيديو/ }))
    await waitFor(() => expect(block().className).toContain('top-16'))
    expect(storedLayout().placement).toBe('top')

    fireEvent.click(screen.getByRole('button', { name: /موضع الترجمة: أعلى الفيديو/ }))
    await waitFor(() => expect(block().className).toContain('bottom-[4.5rem]'))
  })

  it('recovers from a corrupted saved layout', async () => {
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify({ placement: 'sideways', source: 7, translation: null }))
    await renderWithActiveCaption()
    expect(screen.getByTestId('subtitle-line-translation').style.transform).toBe('translate(0px, 0px)')
    expect(screen.getByTestId('subtitle-line-translation').parentElement!.className).toContain('bottom-[4.5rem]')
  })
})

describe('choosing one language', () => {
  it('cycles both → translation only → source only → both from the video', async () => {
    await renderWithActiveCaption()
    expect(screen.getByTestId('subtitle-line-source')).toBeInTheDocument()
    expect(screen.getByTestId('subtitle-line-translation')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /اللغة المعروضة/ }))
    await waitFor(() => expect(screen.queryByTestId('subtitle-line-source')).not.toBeInTheDocument())
    expect(screen.getByTestId('subtitle-line-translation')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /اللغة المعروضة/ }))
    await waitFor(() => expect(screen.queryByTestId('subtitle-line-translation')).not.toBeInTheDocument())
    expect(screen.getByTestId('subtitle-line-source')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /اللغة المعروضة/ }))
    await waitFor(() => expect(screen.getByTestId('subtitle-line-translation')).toBeInTheDocument())
    expect(screen.getByTestId('subtitle-line-source')).toBeInTheDocument()
  })

  it('names the one-language options in the sidebar after the detected languages', async () => {
    await renderWithActiveCaption()
    fireEvent.click(screen.getByRole('radio', { name: 'عرض الإنجليزية فقط' }))
    await waitFor(() => expect(screen.queryByTestId('subtitle-line-source')).not.toBeInTheDocument())
    expect(screen.getByRole('radio', { name: 'عرض الإنجليزية فقط' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'عرض العربية فقط' })).toBeInTheDocument()
  })
})

describe('word meaning on the video', () => {
  function wordButton(word: string) {
    return within(screen.getByTestId('subtitle-line-translation')).getByRole('button', { name: word })
  }

  it('shows the meaning of a clicked word in a card over the video, without seeking', async () => {
    await renderWithActiveCaption()

    fireEvent.click(wordButton('world'))

    const card = await screen.findByRole('region', { name: 'معنى الكلمة المحددة' })
    expect(within(card).getByText('world')).toBeInTheDocument()
    expect(await within(card).findByText('عالم')).toBeInTheDocument()
    expect(activePlayer!.getCurrentTime()).toBe(2)

    fireEvent.click(within(card).getByRole('button', { name: 'إغلاق بطاقة التعريف' }))
    expect(screen.queryByRole('region', { name: 'معنى الكلمة المحددة' })).not.toBeInTheDocument()
  })

  it('closes the card with Escape', async () => {
    await renderWithActiveCaption()
    fireEvent.click(wordButton('Hello'))
    await screen.findByRole('region', { name: 'معنى الكلمة المحددة' })

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('region', { name: 'معنى الكلمة المحددة' })).not.toBeInTheDocument()
  })

  it('ignores the click that ends a drag, so moving a line never opens a card', async () => {
    await renderWithActiveCaption()
    const word = wordButton('world')

    drag(word, { x: 640, y: 730 }, { x: 740, y: 700 })
    fireEvent.click(word)

    expect(screen.queryByRole('region', { name: 'معنى الكلمة المحددة' })).not.toBeInTheDocument()

    // A press that barely moves is still a click
    drag(word, { x: 640, y: 730 }, { x: 641, y: 730 })
    fireEvent.click(word)
    expect(await screen.findByRole('region', { name: 'معنى الكلمة المحددة' })).toBeInTheDocument()
  })

  it('does not make the reference line clickable', async () => {
    await renderWithActiveCaption()
    expect(within(screen.getByTestId('subtitle-line-source')).queryAllByRole('button')).toHaveLength(0)
  })
})
