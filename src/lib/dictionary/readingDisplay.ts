import type { GrammarReading, NounReading, VerbReading } from '@/types/dictionary.types'

const PLURAL_ARTICLE = 'die'
const CONJUGATED_AUXILIARY: Record<string, string> = { haben: 'hat', sein: 'ist' }

/** "die Häuser", or "die Wörter / die Worte"; null when the noun has no plural. */
export function formatPlural(noun: NounReading): string | null {
  return noun.plural.length > 0 ? noun.plural.map((form) => `${PLURAL_ARTICLE} ${form}`).join(' / ') : null
}

/** Perfect tense as German learners memorise it: "ist gegangen", "hat gemacht", "hat/ist gestanden". */
export function formatPerfect(verb: VerbReading): string | null {
  const participle = verb.participle.join(' / ')
  if (!participle) return null
  const auxiliary = verb.auxiliary.map((name) => CONJUGATED_AUXILIARY[name] ?? name).join('/')
  return auxiliary ? `${auxiliary} ${participle}` : participle
}

/** What a saved vocabulary entry keeps from the first reading: the lemma, and for a noun its article and plural. */
export function summarizeForGlossary(readings: GrammarReading[] | undefined): {
  lemma?: string
  article?: string
  plural?: string
} {
  const first = readings?.[0]
  if (!first) return {}
  if (first.kind === 'verb') return { lemma: first.lemma }
  return {
    lemma: first.lemma,
    article: first.articles.join('/'),
    ...(first.plural[0] ? { plural: first.plural[0] } : {}),
  }
}
