import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi } from './testHelpers/mockYouTubePlayer'
import { mockElementSize } from './testHelpers/mockLayout'
import { getGlossaryEntries } from '@/lib/utils/glossaryStore'
import { makeCloze } from '@/lib/utils/glossaryContext'

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

describe('saving a word from reading mode', () => {
  it('keeps the word exactly as it appears in the sentence, so its fill-in-the-blank card works for inflected forms', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
    await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('رفع ملف ترجمة الإنجليزية'), {
      target: { files: [file('de.srt', '1\n00:00:01,000 --> 00:00:04,000\nEr läuft schnell nach Hause\n')] },
    })
    await waitFor(() => expect(screen.getByText('de.srt')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'فتح وضع القراءة' }))
    const view = await screen.findByRole('region', { name: 'وضع القراءة' })

    // "läuft" is the inflected form of "laufen"
    fireEvent.click(within(view).getByText('läuft'))
    fireEvent.click(await within(view).findByRole('button', { name: /أضف إلى المفردات/ }))

    const [saved] = getGlossaryEntries()
    expect(saved?.word).toBe('läuft')
    expect(saved?.context?.sentence).toBe('Er läuft schnell nach Hause')
    expect(saved?.context?.time).toBe(1)
    expect(saved?.context?.videoKey).toBe('youtube:dQw4w9WgXcQ')
    expect(makeCloze(saved!.context!.sentence, saved!.word)).toEqual({
      text: 'Er _____ schnell nach Hause',
      hasBlank: true,
    })
  })
})
