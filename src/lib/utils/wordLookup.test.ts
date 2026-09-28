import { describe, it, expect, vi, afterEach } from 'vitest'
import { lookupWord } from './wordLookup'

const WIKTIONARY_KAFFEE = {
  de: [
    {
      partOfSpeech: 'Noun',
      definitions: [
        { definition: '<span>a <a href="/wiki/coffee">coffee</a> <script>alert(1)</script></span>', examples: ['<i>Ich trinke Kaffee.</i>'] },
      ],
    },
  ],
}

const MYMEMORY_KAFFEE = {
  responseStatus: 200,
  responseData: { translatedText: 'قهوة' },
  matches: [
    { segment: 'Kaffee', translation: 'قهوة' },
    { segment: 'Kaffee', translation: 'بن' },
    { segment: 'Kaffee und Kuchen', translation: 'قهوة وكعك' },
  ],
}

type Route = { ok: boolean; status?: number; body?: unknown } | 'throw'

/** يحاكي fetch بحسب المضيف: كل مصدر له استجابة مستقلة */
function mockFetch(routes: { wiktionary: Route | ((url: string) => Route); mymemory: Route }) {
  const fn = vi.fn(async (input: string) => {
    const route = input.includes('wiktionary')
      ? typeof routes.wiktionary === 'function'
        ? routes.wiktionary(input)
        : routes.wiktionary
      : routes.mymemory
    if (route === 'throw') throw new Error('network down')
    return { ok: route.ok, status: route.status ?? (route.ok ? 200 : 500), json: async () => route.body }
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('lookupWord', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('combines the translation and Wiktionary meanings for a non-English word', async () => {
    mockFetch({ wiktionary: { ok: true, body: WIKTIONARY_KAFFEE }, mymemory: { ok: true, body: MYMEMORY_KAFFEE } })

    const outcome = await lookupWord('Kaffee', 'de', 'ar')

    expect(outcome.kind).toBe('found')
    if (outcome.kind !== 'found') return
    expect(outcome.result.translation).toBe('قهوة')
    // البدائل: فقط المطابقة للكلمة نفسها (لا الجمل الأطول)، بلا تكرار الأساسية
    expect(outcome.result.alternatives).toEqual(['بن'])
    expect(outcome.result.meanings[0]).toEqual({
      partOfSpeech: 'Noun',
      // الوسوم والسكربتات مُزالة، النص الخام فقط
      text: 'a coffee',
      example: 'Ich trinke Kaffee.',
    })
  })

  it('still succeeds when only the translation is available', async () => {
    mockFetch({ wiktionary: { ok: false, status: 404 }, mymemory: { ok: true, body: MYMEMORY_KAFFEE } })
    const outcome = await lookupWord('Kaffee', 'de', 'ar')
    expect(outcome.kind).toBe('found')
  })

  it('still succeeds when only Wiktionary has an entry', async () => {
    mockFetch({ wiktionary: { ok: true, body: WIKTIONARY_KAFFEE }, mymemory: 'throw' })
    const outcome = await lookupWord('Kaffee', 'de', 'ar')
    expect(outcome.kind).toBe('found')
    if (outcome.kind === 'found') expect(outcome.result.translation).toBeNull()
  })

  it('tries the lowercase form too, so sentence-initial German words find their entry', async () => {
    const fetchMock = mockFetch({
      wiktionary: (url) =>
        url.endsWith('/perfekt')
          ? { ok: true, body: { de: [{ partOfSpeech: 'Adjective', definitions: [{ definition: 'perfect' }] }] } }
          : { ok: false, status: 404 },
      mymemory: { ok: true, body: { responseStatus: 200, responseData: { translatedText: 'مثالي' } } },
    })

    const outcome = await lookupWord('Perfekt', 'de', 'ar')

    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/perfekt'))).toBe(true)
    expect(outcome.kind).toBe('found')
    if (outcome.kind === 'found') expect(outcome.result.meanings[0]?.text).toBe('perfect')
  })

  it('reports not-found only when nothing failed but nothing exists', async () => {
    mockFetch({
      wiktionary: { ok: false, status: 404 },
      mymemory: { ok: true, body: { responseStatus: 200, responseData: { translatedText: 'asdfgh' } } },
    })
    expect((await lookupWord('asdfgh', 'de', 'ar')).kind).toBe('not-found')
  })

  it('reports an error (not not-found) when the network fails, so the user can retry', async () => {
    mockFetch({ wiktionary: 'throw', mymemory: 'throw' })
    expect((await lookupWord('Kaffee', 'de', 'ar')).kind).toBe('error')
  })

  it('treats an exhausted MyMemory quota as an error, not as a missing translation', async () => {
    mockFetch({
      wiktionary: { ok: false, status: 404 },
      mymemory: {
        ok: true,
        body: { responseStatus: 429, responseData: { translatedText: 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY' } },
      },
    })
    expect((await lookupWord('Kaffee', 'de', 'ar')).kind).toBe('error')
  })

  it('skips translation when the native language is unknown or the same as the learning language', async () => {
    const fetchMock = mockFetch({ wiktionary: { ok: true, body: { en: [{ partOfSpeech: 'Noun', definitions: [{ definition: 'a drink' }] }] } }, mymemory: { ok: true, body: MYMEMORY_KAFFEE } })
    await lookupWord('coffee', 'en', 'en')
    await lookupWord('coffee', 'en')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('mymemory'))).toBe(false)
  })

  it('maps Chinese to the regional code MyMemory expects', async () => {
    const fetchMock = mockFetch({ wiktionary: { ok: false, status: 404 }, mymemory: { ok: true, body: MYMEMORY_KAFFEE } })
    await lookupWord('你好', 'zh', 'ar')
    const url = String(fetchMock.mock.calls.find(([u]) => String(u).includes('mymemory'))?.[0])
    expect(decodeURIComponent(url)).toContain('langpair=zh-CN|ar')
  })

  it('returns not-found for empty input without calling fetch', async () => {
    const fetchMock = mockFetch({ wiktionary: { ok: true, body: {} }, mymemory: { ok: true, body: {} } })
    expect((await lookupWord('   ', 'de', 'ar')).kind).toBe('not-found')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
