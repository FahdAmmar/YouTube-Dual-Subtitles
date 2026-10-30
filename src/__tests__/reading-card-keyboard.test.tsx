import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'
import { mockElementSize } from './testHelpers/mockLayout'

let restoreLayout: () => void = () => {}

beforeEach(() => {
  restoreLayout = mockElementSize()
  window.localStorage.clear()
  installMockYouTubeApi(() => {})
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) =>
      String(input).includes('wiktionary')
        ? { ok: true, status: 200, json: async () => ({ de: [{ partOfSpeech: 'Verb', definitions: [{ definition: 'To run.' }] }] }) }
        : { ok: true, status: 200, json: async () => ({ responseStatus: 200, responseData: { translatedText: 'يركض' }, matches: [] }) },
    ),
  )
})

afterEach(() => {
  restoreLayout()
  vi.unstubAllGlobals()
})

const file = (name: string, content: string) => new File([content], name, { type: 'text/plain' })

async function openReadingMode() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('رابط الفيديو'), { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/وضع العرض/)).toBeInTheDocument())
  fireEvent.change(screen.getByLabelText('رفع ملف ترجمة الإنجليزية'), {
    target: { files: [file('de.srt', '1\n00:00:01,000 --> 00:00:04,000\nEr läuft schnell nach Hause\n')] },
  })
  await waitFor(() => expect(screen.getByText('de.srt')).toBeInTheDocument())
  fireEvent.click(screen.getByRole('button', { name: 'فتح وضع القراءة' }))
  return screen.findByRole('region', { name: 'وضع القراءة' })
}

describe('reading mode keyboard access to word lookups', () => {
  it('makes a lookup word a focusable button', async () => {
    const view = await openReadingMode()
    const word = within(view).getByRole('button', { name: 'läuft' })
    expect(word).toHaveAttribute('tabindex', '0')
  })

  it('opens the meaning with Enter, like a native button', async () => {
    const view = await openReadingMode()
    fireEvent.keyDown(within(view).getByRole('button', { name: 'läuft' }), { key: 'Enter' })
    expect(await within(view).findByRole('button', { name: /أضف إلى المفردات/ })).toBeInTheDocument()
  })

  it('opens the meaning with Space on key up only, and does not scroll the page on key down', async () => {
    const view = await openReadingMode()
    const word = within(view).getByRole('button', { name: 'läuft' })

    const down = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    word.dispatchEvent(down)
    expect(down.defaultPrevented).toBe(true)
    expect(within(view).queryByRole('button', { name: /أضف إلى المفردات/ })).not.toBeInTheDocument()

    fireEvent.keyUp(word, { key: ' ' })
    expect(await within(view).findByRole('button', { name: /أضف إلى المفردات/ })).toBeInTheDocument()
  })

  it('never nests one interactive element inside another (axe: nested-interactive)', async () => {
    const view = await openReadingMode()
    expect(view.querySelectorAll('[role="button"] button, [role="button"] [role="button"], button [role="button"]')).toHaveLength(0)
  })
})
