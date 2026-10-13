import { getValidContext, replaceWholeWord } from './glossaryContext'
import type { GlossaryEntry } from '@/types/glossary.types'

const FORMULA_TRIGGER = /^[=+\-@]/
const YOUTUBE_KEY_PATTERN = /^youtube:([A-Za-z0-9_-]{11})$/

/** One field of a tab-separated file: untrusted text must not add columns, rows or spreadsheet formulas */
function toField(value: string | null | undefined): string {
  const text = (value ?? '').replace(/[\t\r\n]+/g, ' ').trim()
  return FORMULA_TRIGGER.test(text) ? `'${text}` : text
}

/** Cloze syntax uses {{ }} and ::, so those must not appear inside the text being wrapped */
function neutraliseClozeSyntax(text: string): string {
  return text.replace(/\{\{/g, '{ {').replace(/\}\}/g, '} }').replace(/::/g, ': :')
}

/**
 * The sentence with the word hidden, in Anki's Cloze syntax. The translation becomes the
 * hint Anki shows inside the brackets. Null when the word is not in the sentence as written.
 */
export function makeAnkiCloze(sentence: string, word: string, hint: string | null): string | null {
  const safeHint = hint ? neutraliseClozeSyntax(hint) : null
  const { text, hasMatch } = replaceWholeWord(neutraliseClozeSyntax(sentence), word, (matched) =>
    safeHint ? `{{c1::${matched}::${safeHint}}}` : `{{c1::${matched}}}`,
  )
  return hasMatch ? text : null
}

function toTag(value: string): string {
  return value.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_')
}

/** Only real YouTube ids become links, so a tampered key can never inject markup or a strange URL */
function sceneLink(videoKey: string, time: number): string | null {
  const match = YOUTUBE_KEY_PATTERN.exec(videoKey)
  return match ? `https://www.youtube.com/watch?v=${match[1]}&t=${Math.floor(time)}s` : null
}

function toRow(entry: GlossaryEntry): string {
  const context = getValidContext(entry)
  const hint = entry.translation || null
  const sentenceCloze = context ? makeAnkiCloze(context.sentence, entry.word, hint) : null
  // Without a usable sentence, a lone word with the translation as hint still makes a working card
  const text = sentenceCloze ?? makeAnkiCloze(entry.word, entry.word, hint) ?? entry.word

  const extraParts = [
    entry.translation,
    entry.definition,
    entry.example ? `«${entry.example}»` : null,
    context && !sentenceCloze ? `«${context.sentence}»` : null,
    context ? sceneLink(context.videoKey, context.time) : null,
  ].filter((part): part is string => Boolean(part))

  const tags = ['ydc', toTag(entry.languageCode), entry.partOfSpeech ? toTag(entry.partOfSpeech) : '']
    .filter(Boolean)
    .join(' ')

  return [toField(text), toField(extraParts.join(' | ')), toField(tags)].join('\t')
}

/**
 * Tab-separated file for Anki's import (2.1.54 or newer reads the header lines):
 * Cloze notes with the sentence the word came from, its details, and tags.
 */
export function glossaryToAnki(entries: readonly GlossaryEntry[]): string {
  const header = ['#separator:tab', '#html:false', '#notetype:Cloze', '#columns:Text\tExtra\tTags', '#tags column:3']
  return [...header, ...entries.map(toRow)].join('\n') + '\n'
}
