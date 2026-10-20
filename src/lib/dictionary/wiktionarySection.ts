import { normalizeHeadline } from './germanHeadline'

/** One dictionary entry inside a language section: a headword line plus, for inflected forms, the lemma it points to. */
export interface SectionEntry {
  /** Part-of-speech heading as Wiktionary spells it, lower-cased: "noun", "proper noun", "verb", "participle"… */
  heading: string
  headword: string
  /** The whole headword line: "Haus n (strong, genitive Hauses, plural Häuser)" */
  line: string
  /** Set when this entry is an inflected form ("past participle of gehen"); empty for a lemma. */
  formOf: { lemma: string; description: string }[]
}

const GRAMMAR_WORDS =
  '(?:plural|singular|participle|tense|person|indicative|subjunctive|imperative|infinitive|nominative|genitive|dative|accusative)'

/** "past participle of gehen" -> "gehen". Only wordings that name a grammatical form count. */
function lemmaFromGloss(gloss: string): string | null {
  const inflection = /^(?:inflection|inflected form|form) of ([^\s:;,.()]+)/i.exec(gloss)
  if (inflection?.[1]) return inflection[1]
  return new RegExp(`\\b${GRAMMAR_WORDS}\\b.* of ([^\\s:;,.()]+)$`, 'i').exec(gloss)?.[1] ?? null
}

/** Text of a definition without its nested lists (sub-senses, usage examples). */
function glossText(item: Element): string {
  const clone = item.cloneNode(true) as Element
  clone.querySelectorAll('ol, ul, dl').forEach((node) => node.remove())
  return normalizeHeadline(clone.textContent ?? '')
}

/**
 * Reads the HTML of one language section of an en.wiktionary page. The markup is untrusted external content:
 * DOMParser builds an inert document (no script runs, no image loads), scripts and styles are dropped before any
 * text is read, and nothing from it is ever passed to dangerouslySetInnerHTML.
 *
 * Only a few stable hooks are used so a markup tweak does not break everything: part-of-speech headings,
 * the `headword` class on the entry word, and Wiktionary's `form-of-definition` wrapper for inflected forms.
 */
export function parseSectionEntries(html: string): SectionEntry[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style').forEach((node) => node.remove())

  const entries: SectionEntry[] = []
  let heading = ''
  let current: SectionEntry | null = null
  const glosses = new Map<SectionEntry, string[]>()

  // querySelectorAll keeps document order, so each headword belongs to the heading above it
  for (const node of doc.body.querySelectorAll('h2, h3, h4, h5, h6, .headword, .form-of-definition, ol > li')) {
    if (/^H[2-6]$/.test(node.tagName)) {
      heading = normalizeHeadline(node.textContent ?? '')
        .replace(/\[edit\]$/i, '')
        .trim()
        .toLowerCase()
      current = null
      continue
    }

    if (node.classList.contains('headword')) {
      const container = node.closest('.headword-line') ?? node.closest('p') ?? node.parentElement
      current = {
        heading,
        headword: normalizeHeadline(node.textContent ?? ''),
        line: normalizeHeadline(container?.textContent ?? ''),
        formOf: [],
      }
      entries.push(current)
      continue
    }

    if (!current) continue

    if (node.tagName === 'LI') {
      // Only top-level senses; sub-senses and examples are nested lists
      if (!node.parentElement?.closest('li')) glosses.set(current, [...(glosses.get(current) ?? []), glossText(node)])
      continue
    }

    // Glossary words inside the description ("first-person", "singular") are links too, so only the
    // dedicated lemma link counts; its href targets the language anchor of the page ("/wiki/gehen#German")
    const lemmaLink =
      node.querySelector('.form-of-definition-link a') ??
      [...node.querySelectorAll('a')].find((anchor) => anchor.getAttribute('href')?.endsWith('#German'))
    const lemma = normalizeHeadline(lemmaLink?.textContent ?? '')
    const description = normalizeHeadline(node.textContent ?? '')
    if (lemma && !current.formOf.some((form) => form.lemma === lemma && form.description === description)) {
      current.formOf.push({ lemma, description })
    }
  }

  // Wiktionary's form-of markup is the precise signal; the wording of the definition is a backup in case it changes.
  // An entry whose headword line has no "( … )" details is a bare form, never a lemma with grammar data
  for (const entry of entries) {
    if (entry.formOf.length > 0 || entry.line.includes('(')) continue
    for (const gloss of glosses.get(entry) ?? []) {
      const lemma = lemmaFromGloss(gloss)
      if (lemma) entry.formOf.push({ lemma, description: gloss })
    }
  }

  return entries
}
