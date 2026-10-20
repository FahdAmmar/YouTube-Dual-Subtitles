import type { NounReading, VerbReading } from '@/types/dictionary.types'

/**
 * Reads the headword line Wiktionary shows under every German entry, e.g.
 *   "Haus n (strong, genitive Hauses, plural Häuser)"
 *   "gehen (class 7 strong, third-person singular present geht, past tense ging, past participle gegangen, auxiliary sein)"
 * Wiktextract exposes the same text as `head_templates[].expansion`. Reading the rendered text rather than the
 * wikitext template means Wiktionary's own Lua module has already expanded shorthand such as "n,,^er".
 */

type NounFacts = Pick<NounReading, 'articles' | 'plural' | 'pluralOnly' | 'uncountable'>
type VerbFacts = Pick<VerbReading, 'thirdPerson' | 'preterite' | 'participle' | 'auxiliary'>

const ARTICLE_BY_GENDER: Record<string, string> = { m: 'der', f: 'die', n: 'das', p: 'die', pl: 'die' }
const GENDER_TOKEN = /\b(pl|[mfnc]|p)\b/g
const NO_PLURAL = /\b(?:no plural|uncountable|singular only)\b/

export function normalizeHeadline(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Splits a line into the text outside parentheses and the contents of each top-level group. Depth matters:
 * a long noun line nests "(rare)" qualifiers inside its main group, and a regional qualifier can sit between
 * the headword and the gender ("Joghurt (Germany) m or (Austria) n (strong, ...)").
 */
function splitParentheses(line: string): { outside: string; groups: string[] } {
  const groups: string[] = []
  let outside = ''
  let group = ''
  let depth = 0
  for (const char of line) {
    if (char === '(') {
      if (depth > 0) group += char
      depth += 1
    } else if (char === ')' && depth > 0) {
      depth -= 1
      if (depth === 0) {
        groups.push(group)
        group = ''
      } else {
        group += char
      }
    } else if (depth > 0) {
      group += char
    } else {
      outside += char
    }
  }
  if (depth > 0) groups.push(group)
  return { outside, groups }
}

/** "Wörter or Worte" -> ["Wörter", "Worte"] */
function splitAlternatives(value: string): string[] {
  return value
    .split(/\s+or\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Value after a label such as "plural" inside the details group; it ends at the next comma or bracket. */
function readLabelled(details: string, label: string): string[] {
  const match = new RegExp(`(?:^|[\\s,])${label}\\s+([^,)]+)`).exec(details)
  return match?.[1] ? splitAlternatives(match[1]) : []
}

/**
 * Gender, article and plural of a German noun, or null when the line does not look like a noun entry.
 * `headword` is the entry's own spelling; the gender letters follow it.
 */
export function parseNounHeadline(headword: string, line: string): NounFacts | null {
  const { outside, groups } = splitParentheses(normalizeHeadline(line))
  const afterHeadword = outside.trim().startsWith(headword) ? outside.trim().slice(headword.length) : null
  if (afterHeadword === null) return null

  const genders = afterHeadword.match(GENDER_TOKEN) ?? []
  const articles = [...new Set(genders.map((gender) => ARTICLE_BY_GENDER[gender]).filter((a): a is string => Boolean(a)))]
  if (articles.length === 0) return null

  const details = groups.join(', ')
  const pluralOnly = genders.some((gender) => gender === 'p' || gender === 'pl')
  return {
    articles,
    plural: pluralOnly ? [headword] : readLabelled(details, 'plural'),
    pluralOnly,
    uncountable: !pluralOnly && NO_PLURAL.test(details),
  }
}

/** Principal parts of a German verb, or null for lines without them (inflected forms, other word classes). */
export function parseVerbHeadline(line: string): VerbFacts | null {
  const { groups } = splitParentheses(normalizeHeadline(line))
  const details = groups.join(', ')

  const preterite = readLabelled(details, 'past tense')
  const participle = readLabelled(details, 'past participle')
  if (preterite.length === 0 && participle.length === 0) return null

  return {
    thirdPerson: readLabelled(details, 'third-person singular present'),
    preterite,
    participle,
    auxiliary: readLabelled(details, 'auxiliary'),
  }
}
