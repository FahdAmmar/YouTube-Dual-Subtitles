import { describe, it, expect } from 'vitest'
import { parseNounHeadline, parseVerbHeadline, normalizeHeadline } from './germanHeadline'

// The strings below are the headword lines Wiktionary renders and Wiktextract exposes as
// `head_templates[].expansion` (kaikki.org, German, Oct 2026). Entries marked "verbatim" were copied from there.
describe('parseNounHeadline', () => {
  it('reads gender and plural from a regular noun (verbatim: Wiki)', () => {
    expect(parseNounHeadline('Wiki', 'Wiki n (strong, genitive Wikis, plural Wikis)')).toEqual({
      articles: ['das'],
      plural: ['Wikis'],
      pluralOnly: false,
      uncountable: false,
    })
  })

  it('ignores the nested diminutive list of a long headword line (verbatim: Haus)', () => {
    const line =
      'Haus n (strong, genitive Hauses, plural Häuser, diminutive Häuschen n or Häuslein n or (rare) Häuselein n or (also Ruhrdeutsch) Häusken n or Häusche n)'
    expect(parseNounHeadline('Haus', line)).toMatchObject({ articles: ['das'], plural: ['Häuser'] })
  })

  it('does not read gender letters from inside nested qualifiers', () => {
    const line = 'Haus n (strong, genitive Hauses, plural Häuser, diminutive Häuschen f or (rare) Häuselein f)'
    expect(parseNounHeadline('Haus', line)?.articles).toEqual(['das'])
  })

  it('keeps both genders when regional qualifiers sit between them (verbatim: Joghurt)', () => {
    const line =
      'Joghurt (Germany) m or (Austria, Switzerland, Southern Germany) n (strong, genitive Joghurts, plural Joghurts)'
    expect(parseNounHeadline('Joghurt', line)).toMatchObject({ articles: ['der', 'das'], plural: ['Joghurts'] })
  })

  it('reads the feminine reading of a noun with several entries (verbatim: Joghurt, second entry)', () => {
    const line = 'Joghurt (rare, parts of Austria) f (genitive Joghurt, plural Joghurts)'
    expect(parseNounHeadline('Joghurt', line)).toMatchObject({ articles: ['die'], plural: ['Joghurts'] })
  })

  it('marks a noun without plural (verbatim: Gold)', () => {
    expect(parseNounHeadline('Gold', 'Gold n (strong, genitive Goldes or Golds, no plural)')).toEqual({
      articles: ['das'],
      plural: [],
      pluralOnly: false,
      uncountable: true,
    })
  })

  it('marks a plural-only noun and uses the plural article (verbatim: Eltern)', () => {
    expect(parseNounHeadline('Eltern', 'Eltern pl (plural only)')).toEqual({
      articles: ['die'],
      plural: ['Eltern'],
      pluralOnly: true,
      uncountable: false,
    })
  })

  it('splits alternative plurals written with "or"', () => {
    const result = parseNounHeadline('Wort', 'Wort n (strong, genitive Wortes or Worts, plural Wörter or Worte)')
    expect(result?.plural).toEqual(['Wörter', 'Worte'])
  })

  it('supports multi-word headwords', () => {
    expect(parseNounHeadline('Bad Homburg', 'Bad Homburg n (genitive Bad Homburgs)')?.articles).toEqual(['das'])
  })

  it('returns null when the line has no gender (an inflected-form line, an adjective)', () => {
    expect(parseNounHeadline('Häuser', 'Häuser')).toBeNull()
    expect(parseNounHeadline('groß', 'groß (comparative größer, superlative am größten)')).toBeNull()
  })

  it('does not mistake the letter m inside the headword for a gender', () => {
    expect(parseNounHeadline('Mama', 'Mama')).toBeNull()
  })
})

describe('parseVerbHeadline', () => {
  it('reads the principal parts of a strong verb (verbatim: gehen)', () => {
    const line =
      'gehen (class 7 strong, third-person singular present geht, past tense ging, past participle gegangen, auxiliary sein)'
    expect(parseVerbHeadline(line)).toEqual({
      thirdPerson: ['geht'],
      preterite: ['ging'],
      participle: ['gegangen'],
      auxiliary: ['sein'],
    })
  })

  it('reads a weak verb (verbatim: machen)', () => {
    const line =
      'machen (weak, third-person singular present macht, past tense machte, past participle gemacht, auxiliary haben)'
    expect(parseVerbHeadline(line)).toMatchObject({ preterite: ['machte'], participle: ['gemacht'], auxiliary: ['haben'] })
  })

  it('keeps both auxiliaries and separable prefixes', () => {
    const line =
      'aufstehen (class 7 strong, third-person singular present steht auf, past tense stand auf, past participle aufgestanden, past subjunctive stünde auf or stände auf, auxiliary haben or sein)'
    expect(parseVerbHeadline(line)).toEqual({
      thirdPerson: ['steht auf'],
      preterite: ['stand auf'],
      participle: ['aufgestanden'],
      auxiliary: ['haben', 'sein'],
    })
  })

  it('returns null for an inflected form line', () => {
    expect(parseVerbHeadline('gegangen')).toBeNull()
  })
})

describe('normalizeHeadline', () => {
  it('collapses whitespace and non-breaking spaces', () => {
    expect(normalizeHeadline('Haus\u00a0 n\n (strong,   genitive Hauses)')).toBe('Haus n (strong, genitive Hauses)')
  })
})
