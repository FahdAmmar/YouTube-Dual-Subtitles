import { describe, it, expect, vi, afterEach } from 'vitest'
import { lookupGrammar } from './wiktionaryGrammar'

// German-section HTML in the shape documented in wiktionarySection.test.ts
const HAUS = `<h3>Noun</h3><p><span class="headword-line"><strong class="headword">Haus</strong> <span class="gender"><abbr>n</abbr></span> (<i>strong, genitive</i> Hauses, <i>plural</i> Häuser)</span></p><ol><li>house</li></ol>`
const GEHEN = `<h3>Verb</h3><p><span class="headword-line"><strong class="headword">gehen</strong> (<i>class 7 strong, third-person singular present</i> geht, <i>past tense</i> ging, <i>past participle</i> gegangen, <i>auxiliary</i> sein)</span></p><ol><li>to go</li></ol>`
const GEGANGEN = `<h3>Participle</h3><p><strong class="headword">gegangen</strong></p><ol><li><span class="form-of-definition"><a href="/wiki/Appendix:Glossary#past_participle">past participle</a> of <span class="form-of-definition-link"><a href="/wiki/gehen#German">gehen</a></span></span></li></ol>`
const REISE = `<h3>Noun</h3><p><strong class="headword">Reise</strong> f (genitive Reise, plural Reisen)</p><ol><li>journey</li></ol>`
const REISEN = `<h3>Noun</h3><p><strong class="headword">Reisen</strong> n (strong, genitive Reisens, no plural)</p><ol><li>travelling</li></ol>
  <h3>Noun</h3><p><strong class="headword">Reisen</strong></p><ol><li><span class="form-of-definition">plural of <span class="form-of-definition-link"><a href="/wiki/Reise#German">Reise</a></span></span></li></ol>`

type Page = { german: string } | { otherLanguageOnly: true }

/** Fake en.wiktionary Action API: `pages` maps a title to its content; a missing title is a missing page. */
function mockWiktionary(pages: Record<string, Page>, failFor: string[] = []) {
  const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
  const fn = vi.fn(async (input: string) => {
    const params = new URL(input).searchParams
    const title = params.get('page') ?? ''
    if (failFor.includes(title)) throw new Error('network down')
    const page = pages[title]
    if (!page) return json({ error: { code: 'missingtitle', info: 'The page you specified doesn’t exist.' } })
    if (params.get('prop') === 'sections') {
      const sections =
        'german' in page
          ? [{ line: 'Dutch', level: '2', index: '1' }, { line: 'German', level: '2', index: '2' }, { line: 'Noun', level: '3', index: '3' }]
          : [{ line: 'French', level: '2', index: '1' }]
      return json({ parse: { title, sections } })
    }
    expect(params.get('section')).toBe('2')
    return json({ parse: { title, text: 'german' in page ? page.german : '' } })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const titlesRequested = (fn: ReturnType<typeof vi.fn>) =>
  [...new Set(fn.mock.calls.map(([url]) => new URL(String(url)).searchParams.get('page')))]

describe('lookupGrammar', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('gives the article and plural of a noun', async () => {
    mockWiktionary({ Haus: { german: HAUS } })

    const result = await lookupGrammar('Haus', 'de')

    expect(result).toEqual({
      status: 'ok',
      value: {
        readings: [
          { kind: 'noun', lemma: 'Haus', formDescription: null, translation: null, articles: ['das'], plural: ['Häuser'], pluralOnly: false, uncountable: false },
        ],
      },
    })
  })

  it('gives the principal parts of a verb', async () => {
    mockWiktionary({ gehen: { german: GEHEN } })

    const result = await lookupGrammar('gehen', 'de')

    expect(result).toMatchObject({
      status: 'ok',
      value: { readings: [{ kind: 'verb', lemma: 'gehen', thirdPerson: ['geht'], preterite: ['ging'], participle: ['gegangen'], auxiliary: ['sein'] }] },
    })
  })

  it('resolves an inflected verb form to its infinitive and keeps the description', async () => {
    mockWiktionary({ gegangen: { german: GEGANGEN }, gehen: { german: GEHEN } })

    const result = await lookupGrammar('gegangen', 'de')

    expect(result).toMatchObject({
      status: 'ok',
      value: { readings: [{ kind: 'verb', lemma: 'gehen', formDescription: 'past participle of gehen', participle: ['gegangen'] }] },
    })
  })

  it('finds a noun typed in lowercase, as auto-generated captions are', async () => {
    const fetchMock = mockWiktionary({ Haus: { german: HAUS } })

    const result = await lookupGrammar('haus', 'de')

    expect(titlesRequested(fetchMock)).toEqual(['haus', 'Haus'])
    expect(result).toMatchObject({ status: 'ok', value: { readings: [{ lemma: 'Haus', articles: ['das'] }] } })
  })

  it('does not look for a capitalised page when the exact spelling already has an entry', async () => {
    const fetchMock = mockWiktionary({ gehen: { german: GEHEN }, Gehen: { german: HAUS } })

    await lookupGrammar('gehen', 'de')

    expect(titlesRequested(fetchMock)).toEqual(['gehen'])
  })

  it('lists every reading of a word that is both a lemma and a form of another word', async () => {
    mockWiktionary({ Reisen: { german: REISEN }, Reise: { german: REISE } })

    const result = await lookupGrammar('Reisen', 'de')

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.value.readings.map((reading) => [reading.lemma, reading.formDescription])).toEqual([
      ['Reisen', null],
      ['Reise', 'plural of Reise'],
    ])
  })

  it('asks only the Wikimedia API, as a cross-origin request without credentials-bearing headers', async () => {
    const fetchMock = mockWiktionary({ Haus: { german: HAUS } })

    await lookupGrammar('Haus', 'de')

    for (const [url, init] of fetchMock.mock.calls as unknown[][]) {
      const parsed = new URL(String(url))
      expect(parsed.origin + parsed.pathname).toBe('https://en.wiktionary.org/w/api.php')
      expect(parsed.searchParams.get('origin')).toBe('*')
      expect((init as RequestInit | undefined)?.headers).toBeUndefined()
    }
  })

  it('is empty when the page has no German section', async () => {
    mockWiktionary({ Haus: { otherLanguageOnly: true } })
    expect(await lookupGrammar('Haus', 'de')).toEqual({ status: 'empty' })
  })

  it('is empty for an unknown word', async () => {
    mockWiktionary({})
    expect(await lookupGrammar('Qwertzuiop', 'de')).toEqual({ status: 'empty' })
  })

  it('does not call the network for languages without a grammar reader', async () => {
    const fetchMock = mockWiktionary({})
    expect(await lookupGrammar('maison', 'fr')).toEqual({ status: 'empty' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports an error, not "empty", when the network fails', async () => {
    mockWiktionary({ Haus: { german: HAUS } }, ['Haus'])
    expect(await lookupGrammar('Haus', 'de')).toEqual({ status: 'error' })
  })

  it('keeps the readings it found when a request for another reading fails', async () => {
    mockWiktionary({ Reisen: { german: REISEN }, Reise: { german: REISE } }, ['Reise'])

    const result = await lookupGrammar('Reisen', 'de')

    expect(result.status).toBe('ok')
    if (result.status === 'ok') expect(result.value.readings.map((reading) => reading.lemma)).toEqual(['Reisen'])
  })

  it('reports an error when the lemma of an inflected form cannot be fetched', async () => {
    mockWiktionary({ gegangen: { german: GEGANGEN }, gehen: { german: GEHEN } }, ['gehen'])
    expect(await lookupGrammar('gegangen', 'de')).toEqual({ status: 'error' })
  })

  it('reports a server error status as an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })))
    expect(await lookupGrammar('Haus', 'de')).toEqual({ status: 'error' })
  })
})
