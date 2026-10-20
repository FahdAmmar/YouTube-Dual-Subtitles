/** Outcome of asking one source: data, nothing found (404 / no entry), or a failure (network, quota, server). */
export type SourcePart<T> = { status: 'ok'; value: T } | { status: 'empty' } | { status: 'error' }

interface ReadingBase {
  /** Dictionary form: nominative singular for a noun, infinitive for a verb. */
  lemma: string
  /** Wiktionary's wording when the clicked word is an inflected form ("past participle of gehen"); null for the lemma itself. */
  formDescription: string | null
  /** Meaning of `lemma` in the user's language. Only filled when the lemma differs from the clicked word. */
  translation: string | null
}

/** One noun entry of the clicked word. Homographs ("der See" / "die See") give several readings. */
export interface NounReading extends ReadingBase {
  kind: 'noun'
  /** Definite articles, one per grammatical gender: ["der"], or ["der", "das"] for "m or n" nouns. */
  articles: string[]
  plural: string[]
  /** The noun exists only in the plural ("Eltern"). */
  pluralOnly: boolean
  /** The noun has no plural ("Gold"). */
  uncountable: boolean
}

/** One verb entry: the principal parts a learner needs to conjugate it. */
export interface VerbReading extends ReadingBase {
  kind: 'verb'
  /** er/sie/es form of the present tense. */
  thirdPerson: string[]
  preterite: string[]
  participle: string[]
  /** "haben", "sein", or both. */
  auxiliary: string[]
}

export type GrammarReading = NounReading | VerbReading

export interface WordGrammar {
  readings: GrammarReading[]
}
