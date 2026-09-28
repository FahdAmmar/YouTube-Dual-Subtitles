import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '../App'
import { installMockYouTubeApi, type MockYouTubePlayer } from './testHelpers/mockYouTubePlayer'

let activePlayer: MockYouTubePlayer | null = null

beforeEach(() => {
  activePlayer = null
  window.localStorage.clear()
  installMockYouTubeApi((player) => {
    activePlayer = player
  })
})

function makeFile(name: string, content: string) {
  return new File([content], name, { type: 'text/plain' })
}

const SOURCE_SRT = `1\n00:00:01,000 --> 00:00:04,000\nمرحباً بالعالم\n`
// كلمتان منفصلتان عمداً: النقر على "world" وحدها يجب أن يجد عنصرها بلا
// لبس، بخلاف نص من كلمة واحدة فقط حيث يتطابق كل من <p> و<span> الحاويَين
// معاً على نفس النص فيُخفق getByText بسبب تعدد العناصر المطابقة
const TRANSLATION_SRT = `1\n00:00:01,000 --> 00:00:04,000\nHello world\n`

// مصدران مستقلان: ويكاموس (تعريف) وMyMemory (ترجمة إلى العربية — لغة المسار المرجعي)
const WIKTIONARY_RESPONSE = {
  en: [
    {
      partOfSpeech: 'Noun',
      definitions: [{ definition: 'The earth and all people and things on it.', examples: ['travel the world'] }],
    },
  ],
}
const MYMEMORY_RESPONSE = { responseStatus: 200, responseData: { translatedText: 'عالم' }, matches: [] }

function stubLookupServices(options: { wiktionary?: 'ok' | 'not-found' | 'throw'; mymemory?: 'ok' | 'same-as-word' | 'throw' } = {}) {
  const { wiktionary = 'ok', mymemory = 'ok' } = options
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      if (String(input).includes('wiktionary')) {
        if (wiktionary === 'throw') throw new Error('offline')
        if (wiktionary === 'not-found') return { ok: false, status: 404, json: async () => ({}) }
        return { ok: true, status: 200, json: async () => WIKTIONARY_RESPONSE }
      }
      if (mymemory === 'throw') throw new Error('offline')
      if (mymemory === 'same-as-word') {
        return { ok: true, status: 200, json: async () => ({ responseStatus: 200, responseData: { translatedText: 'world' }, matches: [] }) }
      }
      return { ok: true, status: 200, json: async () => MYMEMORY_RESPONSE }
    }),
  )
}

async function loadVideoWithSubtitles() {
  render(<App />)
  fireEvent.change(screen.getByLabelText('VIDEO_URL'), {
    target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  })
  fireEvent.click(screen.getByRole('button', { name: /تشغيل/ }))
  await waitFor(() => expect(screen.getByText(/DISPLAY_MODE/)).toBeInTheDocument())

  await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة العربية'), {
    target: { files: [makeFile('ar.srt', SOURCE_SRT)] },
  })
  await fireEvent.change(screen.getByLabelText('رفع ملف ترجمة الإنجليزية'), {
    target: { files: [makeFile('en.srt', TRANSLATION_SRT)] },
  })
  await waitFor(() => expect(screen.getByText('world', { selector: 'span' })).toBeInTheDocument())
}

describe('word lookup and personal glossary', () => {
  it('shows a definition card when a word is clicked, without seeking the video', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    stubLookupServices()

    await loadVideoWithSubtitles()
    fireEvent.click(screen.getByText('world', { selector: 'span' }))

    // الترجمة إلى العربية + التعريف من ويكاموس
    await waitFor(() => expect(screen.getByText('عالم')).toBeInTheDocument())
    expect(screen.getByText('The earth and all people and things on it.')).toBeInTheDocument()
    expect(screen.getByText('Noun')).toBeInTheDocument()

    // النقر على كلمة يجب ألا يُسرّب قفزاً للفيديو
    expect(activePlayer?.getCurrentTime()).toBe(0)

    vi.unstubAllGlobals()
    errorSpy.mockRestore()
  })

  it('shows a not-found message with an external fallback link when no source has the word', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    stubLookupServices({ wiktionary: 'not-found', mymemory: 'same-as-word' })

    await loadVideoWithSubtitles()
    fireEvent.click(screen.getByText('world', { selector: 'span' }))

    await waitFor(() => expect(screen.getByText('لم نعثر على معنى لهذه الكلمة في المصادر المتاحة')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'البحث في مترجم جوجل' })).toHaveAttribute('rel', 'noopener noreferrer')

    vi.unstubAllGlobals()
    errorSpy.mockRestore()
  })

  it('shows a retryable network error (not "not found") when the services are unreachable', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    stubLookupServices({ wiktionary: 'throw', mymemory: 'throw' })

    await loadVideoWithSubtitles()
    fireEvent.click(screen.getByText('world', { selector: 'span' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument())
    expect(screen.queryByText('لم نعثر على معنى لهذه الكلمة في المصادر المتاحة')).not.toBeInTheDocument()

    // بعد عودة الاتصال، إعادة المحاولة تنجح
    stubLookupServices()
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    await waitFor(() => expect(screen.getByText('عالم')).toBeInTheDocument())

    vi.unstubAllGlobals()
    errorSpy.mockRestore()
  })

  it('saves a looked-up word to the personal glossary, and it appears in the glossary panel', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    stubLookupServices()

    await loadVideoWithSubtitles()
    fireEvent.click(screen.getByText('world', { selector: 'span' }))
    await waitFor(() => expect(screen.getByText('أضف إلى المفردات')).toBeInTheDocument())

    fireEvent.click(screen.getByText('أضف إلى المفردات'))
    await waitFor(() => expect(screen.getByText('أُضيفت إلى المفردات')).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('فتح المفردات الشخصية'))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'المفردات الشخصية' })).toBeInTheDocument())

    const dialog = screen.getByRole('dialog', { name: 'المفردات الشخصية' })
    expect(within(dialog).getByText('world')).toBeInTheDocument()
    expect(within(dialog).getByText('عالم')).toBeInTheDocument()
    expect(within(dialog).getByText('The earth and all people and things on it.')).toBeInTheDocument()

    vi.unstubAllGlobals()
    errorSpy.mockRestore()
  })
})
