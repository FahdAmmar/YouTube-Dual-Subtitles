import type { GlossaryEntry } from '@/types/glossary.types'

const FORMULA_TRIGGER = /^[=+\-@\t\r]/
const NEEDS_QUOTING = /[",\r\n]/

/** Cells come from untrusted subtitle/dictionary text; a leading quote stops Excel from running them as formulas */
function toCsvCell(value: string | null | undefined): string {
  const text = value ?? ''
  const safe = FORMULA_TRIGGER.test(text) ? `'${text}` : text
  return NEEDS_QUOTING.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/**
 * Headerless CSV so Anki does not import a header as a card.
 * Columns: word, translation, definition, example, part of speech, language
 */
export function glossaryToCsv(entries: readonly GlossaryEntry[]): string {
  return entries
    .map((entry) =>
      [entry.word, entry.translation, entry.definition, entry.example, entry.partOfSpeech, entry.languageCode]
        .map(toCsvCell)
        .join(',') + '\r\n',
    )
    .join('')
}
