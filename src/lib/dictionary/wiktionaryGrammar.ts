import type { GrammarReading, SourcePart, WordGrammar } from '@/types/dictionary.types'
import { parseNounHeadline, parseVerbHeadline } from './germanHeadline'
import { parseSectionEntries, type SectionEntry } from './wiktionarySection'

/**
 * Grammar facts (article, plural, verb principal parts, lemma of an inflected form) from English Wiktionary,
 * read through the Wikimedia Action API: free, no key, and it answers cross-origin requests when `origin=*` is sent,
 * so it works from a static site. The same Wiktionary entries are what Wiktextract/kaikki.org turn into JSON dumps;
 * those dumps are too large to fetch per word, so the live site is the browser-friendly way to the same data.
 */
const API_URL = 'https://en.wiktionary.org/w/api.php'

/** Languages with a grammar reader, keyed by the app's language code; the value is Wiktionary's section name. */
const SECTION_BY_LANGUAGE: Record<string, string> = { de: 'German' }

const NO_ENTRY_CODES = new Set(['missingtitle', 'invalidtitle'])
const MAX_LEMMA_PAGES = 3
const MAX_READINGS = 3

interface ParseResult {
  sections?: { line?: string; level?: string | number; index?: string }[]
  text?: string
}
interface ApiResponse {
  error?: { code?: string }
  parse?: ParseResult
}

export function hasGrammarSupport(languageCode: string): boolean {
  return languageCode in SECTION_BY_LANGUAGE
}

async function requestParse(params: Record<string, string>, signal?: AbortSignal): Promise<SourcePart<ParseResult>> {
  try {
    const query = new URLSearchParams({ action: 'parse', format: 'json', formatversion: '2', origin: '*', ...params })
    // No custom headers: they would turn this into a preflighted request
    const response = await fetch(`${API_URL}?${query}`, { signal })
    if (response.status === 404) return { status: 'empty' }
    if (!response.ok) return { status: 'error' }

    const data = (await response.json()) as ApiResponse
    // The Action API reports problems in the body, with HTTP 200. A word that cannot be a page title has no entry
    if (data.error) return data.error.code && NO_ENTRY_CODES.has(data.error.code) ? { status: 'empty' } : { status: 'error' }
    return data.parse ? { status: 'ok', value: data.parse } : { status: 'empty' }
  } catch {
    return { status: 'error' }
  }
}

/** Entries of one language section of a page; 'empty' when the page or the language section does not exist. */
async function fetchSectionEntries(
  title: string,
  sectionName: string,
  signal?: AbortSignal,
): Promise<SourcePart<SectionEntry[]>> {
  const outline = await requestParse({ page: title, prop: 'sections' }, signal)
  if (outline.status !== 'ok') return outline

  const section = outline.value.sections?.find(
    (candidate) => candidate.line === sectionName && String(candidate.level) === '2' && /^\d+$/.test(candidate.index ?? ''),
  )
  if (!section?.index) return { status: 'empty' }

  const content = await requestParse(
    { page: title, section: section.index, prop: 'text', disableeditsection: '1', disablelimitreport: '1', disabletoc: '1' },
    signal,
  )
  if (content.status !== 'ok') return content
  return typeof content.value.text === 'string'
    ? { status: 'ok', value: parseSectionEntries(content.value.text) }
    : { status: 'empty' }
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/** Lemma entries (not inflected forms) of a page, as readings. */
function readingsFromEntries(entries: SectionEntry[], formDescription: string | null): GrammarReading[] {
  const lemmaEntries = entries.filter((entry) => entry.formOf.length === 0)
  // A proper noun ("Haus", a village) only matters when the word has no common-noun entry
  const commonNouns = lemmaEntries.filter((entry) => entry.heading === 'noun')
  const nounEntries = commonNouns.length > 0 ? commonNouns : lemmaEntries.filter((entry) => entry.heading === 'proper noun')

  const readings: GrammarReading[] = []
  for (const entry of nounEntries) {
    const facts = parseNounHeadline(entry.headword, entry.line)
    if (facts) readings.push({ kind: 'noun', lemma: entry.headword, formDescription, translation: null, ...facts })
  }
  for (const entry of lemmaEntries.filter((candidate) => candidate.heading === 'verb')) {
    const facts = parseVerbHeadline(entry.line)
    if (facts) readings.push({ kind: 'verb', lemma: entry.headword, formDescription, translation: null, ...facts })
  }
  return readings
}

function readingKey(reading: GrammarReading): string {
  return JSON.stringify([reading.kind, reading.lemma, reading.kind === 'noun' ? [reading.articles, reading.plural] : reading.participle])
}

/**
 * Everything a learner wants to know about a clicked word: for a noun its article and plural, for a verb its
 * infinitive and principal parts, and for an inflected form ("gegangen", "Häuser") the lemma it belongs to.
 * A word can have several readings ("Reisen" is both a noun and the plural of "Reise").
 */
export async function lookupGrammar(
  word: string,
  languageCode: string,
  signal?: AbortSignal,
): Promise<SourcePart<WordGrammar>> {
  const sectionName = SECTION_BY_LANGUAGE[languageCode]
  if (!sectionName) return { status: 'empty' }

  let hadError = false
  async function fetchPages(titles: string[]) {
    const parts = await Promise.all(titles.map((title) => fetchSectionEntries(title, sectionName as string, signal)))
    const pages: { title: string; entries: SectionEntry[] }[] = []
    parts.forEach((part, index) => {
      if (part.status === 'error') hadError = true
      if (part.status === 'ok' && part.value.length > 0) pages.push({ title: titles[index] as string, entries: part.value })
    })
    return pages
  }

  // A sentence-initial German word is capitalised ("Gehen"), a noun in auto-generated captions is not ("haus"):
  // try the spelling as clicked and its lower-case form together, and the capitalised form only as a last resort
  const lower = word.toLowerCase()
  const firstTitles = [...new Set([word, lower])]
  let pages = await fetchPages(firstTitles)
  if (pages.length === 0 && !firstTitles.includes(capitalize(lower))) pages = await fetchPages([capitalize(lower)])

  const readings: GrammarReading[] = []
  const lemmaDescriptions = new Map<string, string>()
  for (const page of pages) {
    readings.push(...readingsFromEntries(page.entries, null))
    for (const entry of page.entries) {
      for (const form of entry.formOf) if (!lemmaDescriptions.has(form.lemma)) lemmaDescriptions.set(form.lemma, form.description)
    }
  }

  const loaded = new Set(pages.map((page) => page.title))
  const lemmaTitles = [...lemmaDescriptions.keys()].filter((title) => !loaded.has(title)).slice(0, MAX_LEMMA_PAGES)
  for (const lemmaPage of await fetchPages(lemmaTitles)) {
    readings.push(...readingsFromEntries(lemmaPage.entries, lemmaDescriptions.get(lemmaPage.title) ?? null))
  }

  const unique = [...new Map(readings.map((reading) => [readingKey(reading), reading])).values()].slice(0, MAX_READINGS)
  if (unique.length > 0) return { status: 'ok', value: { readings: unique } }
  return hadError ? { status: 'error' } : { status: 'empty' }
}
