import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { lookupWord } from './wordLookup'
import { STORAGE_KEYS } from '@/constants/theme.constants'

const HAUS = `<h3>Noun</h3><p><strong class="headword">Haus</strong> n (strong, genitive Hauses, plural Häuser)</p><ol><li>house</li></ol>`
const GEHEN = `<h3>Verb</h3><p><strong class="headword">gehen</strong> (class 7 strong, third-person singular present geht, past tense ging, past participle gegangen, auxiliary sein)</p><ol><li>to go</li></ol>`
const GEGANGEN = `<h3>Participle</h3><p><strong class="headword">gegangen</strong></p><ol><li><span class="form-of-definition">past participle of <span class="form-of-definition-link"><a href="/wiki/gehen#German">gehen</a></span></span></li></ol>`

const GERMAN_PAGES: Record<string, string> = { Haus: HAUS, gehen: GEHEN, gegangen: GEGANGEN }
const ARABIC: Record<string, string> = { Haus: 'منزل', Häuser: 'منازل', gehen: 'يذهب', gegangen: 'ذهب' }

interface Behaviour {
  /** Makes every Action API request fail, as when Wikimedia is unreachable */
  actionApiDown?: boolean
  /** Makes MyMemory fail */
  translationDown?: boolean
}

/** Routes by host: Action API (grammar), REST definition API (meanings) and MyMemory (translation). */
function mockNetwork(behaviour: Behaviour = {}) {
  const fn = vi.fn(async (input: string) => {
    const url = new URL(input)
    const json = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body })

    if (url.pathname === '/w/api.php') {
      if (behaviour.actionApiDown) throw new Error('network down')
      const title = url.searchParams.get('page') ?? ''
      const german = GERMAN_PAGES[title]
      if (!german) return json({ error: { code: 'missingtitle' } })
      if (url.searchParams.get('prop') === 'sections') {
        return json({ parse: { sections: [{ line: 'German', level: '2', index: '1' }] } })
      }
      return json({ parse: { text: german } })
    }
    if (url.hostname === 'en.wiktionary.org') return json({}, false, 404)

    if (behaviour.translationDown) throw new Error('network down')
    const text = url.searchParams.get('q') ?? ''
    const translated = ARABIC[text]
    return json({ responseStatus: 200, responseData: { translatedText: translated ?? text } })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const translationQueries = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls
    .map(([url]) => new URL(String(url)))
    .filter((url) => url.hostname === 'api.mymemory.translated.net')
    .map((url) => url.searchParams.get('q'))

const actionApiCalls = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls.filter(([url]) => new URL(String(url)).pathname === '/w/api.php').length

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('lookupWord with grammar', () => {
  it('adds the article and plural of a German noun next to its translation', async () => {
    const fetchMock = mockNetwork()

    const outcome = await lookupWord('Haus', 'de', 'ar')

    expect(outcome.kind).toBe('found')
    if (outcome.kind !== 'found') return
    expect(outcome.result.translation).toBe('منزل')
    expect(outcome.result.grammar?.readings).toEqual([
      { kind: 'noun', lemma: 'Haus', formDescription: null, translation: null, articles: ['das'], plural: ['Häuser'], pluralOnly: false, uncountable: false },
    ])
    // The clicked word is the lemma, so translating it a second time would only spend quota
    expect(translationQueries(fetchMock)).toEqual(['Haus'])
  })

  it('translates the infinitive of an inflected verb form as well as the form itself', async () => {
    const fetchMock = mockNetwork()

    const outcome = await lookupWord('gegangen', 'de', 'ar')

    expect(outcome.kind).toBe('found')
    if (outcome.kind !== 'found') return
    expect(outcome.result.translation).toBe('ذهب')
    expect(outcome.result.grammar?.readings[0]).toMatchObject({
      kind: 'verb',
      lemma: 'gehen',
      formDescription: 'past participle of gehen',
      translation: 'يذهب',
    })
    expect(translationQueries(fetchMock).sort()).toEqual(['gegangen', 'gehen'])
  })

  it('does not ask the grammar source about languages it cannot read', async () => {
    const fetchMock = mockNetwork()

    await lookupWord('maison', 'fr', 'ar')

    expect(actionApiCalls(fetchMock)).toBe(0)
  })

  it('does not contact Wiktionary for grammar while online lookups are switched off', async () => {
    window.localStorage.setItem(STORAGE_KEYS.ONLINE_LOOKUP, 'false')
    const fetchMock = mockNetwork()

    expect((await lookupWord('Haus', 'de', 'ar')).kind).toBe('disabled')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still shows the translation when the grammar source is down, and does not remember that gap', async () => {
    mockNetwork({ actionApiDown: true })

    const first = await lookupWord('Haus', 'de', 'ar')
    expect(first.kind).toBe('found')
    if (first.kind === 'found') expect(first.result.grammar).toBeUndefined()

    // Wikimedia is back: the next click must ask again instead of serving the grammar-less result for a month
    mockNetwork()
    const second = await lookupWord('Haus', 'de', 'ar')
    expect(second.kind).toBe('found')
    if (second.kind === 'found') expect(second.result.grammar?.readings).toHaveLength(1)
  })

  it('shows the grammar alone when no translation is available', async () => {
    mockNetwork({ translationDown: true })

    const outcome = await lookupWord('Haus', 'de', 'ar')

    expect(outcome.kind).toBe('found')
    if (outcome.kind === 'found') {
      expect(outcome.result.translation).toBeNull()
      expect(outcome.result.grammar?.readings[0]).toMatchObject({ lemma: 'Haus' })
    }
  })

  it('remembers a complete result, grammar included', async () => {
    const fetchMock = mockNetwork()
    await lookupWord('Haus', 'de', 'ar')
    const callsAfterFirst = fetchMock.mock.calls.length

    const second = await lookupWord('haus', 'de', 'ar')

    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst)
    expect(second.kind === 'found' && second.result.grammar?.readings[0]?.lemma).toBe('Haus')
  })

  it('does not serve results cached before grammar existed, so old German lookups gain their article', async () => {
    window.localStorage.setItem(
      'ydc:lookup-cache',
      JSON.stringify({ 'de|ar|haus': { at: Date.now(), result: { word: 'Haus', translation: 'منزل', alternatives: [], meanings: [] } } }),
    )
    const fetchMock = mockNetwork()

    const outcome = await lookupWord('Haus', 'de', 'ar')

    expect(fetchMock).toHaveBeenCalled()
    expect(outcome.kind === 'found' && outcome.result.grammar?.readings.length).toBe(1)
  })
})
