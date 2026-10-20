import { formatPerfect, formatPlural } from '@/lib/dictionary/readingDisplay'
import type { GrammarReading, NounReading, VerbReading } from '@/types/dictionary.types'

// Colour is a hint only (blue der, red die, green das, the usual way to learn German genders): the article is always
// written out, and the text stays text-text-primary so contrast does not depend on these tints
const ARTICLE_STYLE: Record<string, string> = {
  der: 'border-info/50 bg-info/15',
  die: 'border-error/50 bg-error/15',
  das: 'border-success/50 bg-success/15',
}
const NEUTRAL_ARTICLE_STYLE = 'border-border bg-surface'

interface GrammarReadingsProps {
  readings: GrammarReading[]
  /** Language of the word, so screen readers pronounce the German parts as German */
  languageCode: string
}

/** Wiktionary words the relation in English ("past participle of gehen") */
function FormDescription({ reading }: { reading: GrammarReading }) {
  if (!reading.formDescription) return null
  return (
    <p className="text-xs text-text-secondary" dir="ltr" lang="en">
      {reading.formDescription}
    </p>
  )
}

function LemmaTranslation({ reading }: { reading: GrammarReading }) {
  if (!reading.translation) return null
  return (
    <p className="font-semibold text-text-primary" dir="auto">
      {reading.translation}
    </p>
  )
}

function NounBlock({ reading, languageCode }: { reading: NounReading; languageCode: string }) {
  const plural = formatPlural(reading)
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-1.5" dir="ltr" lang={languageCode}>
        {reading.articles.map((article) => (
          <span
            key={article}
            className={`rounded-sm border px-1.5 py-0.5 font-mono text-xs font-semibold text-text-primary ${ARTICLE_STYLE[article] ?? NEUTRAL_ARTICLE_STYLE}`}
          >
            {article}
          </span>
        ))}
        <span className="text-base font-semibold text-text-primary">{reading.lemma}</span>
      </div>
      <FormDescription reading={reading} />
      <LemmaTranslation reading={reading} />
      {plural && (
        <p className="text-xs text-text-secondary">
          الجمع:{' '}
          <span className="font-medium text-text-primary" dir="ltr" lang={languageCode}>
            {plural}
          </span>
        </p>
      )}
      {reading.pluralOnly && <p className="text-xs text-text-secondary">يُستعمل بصيغة الجمع فقط</p>}
      {reading.uncountable && <p className="text-xs text-text-secondary">لا جمع له</p>}
    </>
  )
}

function VerbBlock({ reading, languageCode }: { reading: VerbReading; languageCode: string }) {
  const perfect = formatPerfect(reading)
  const parts: { label: string; value: string }[] = [
    { label: 'المضارع (er/sie/es)', value: reading.thirdPerson.join(' / ') },
    { label: 'الماضي (Präteritum)', value: reading.preterite.join(' / ') },
    { label: 'التصريف الثالث (Partizip II)', value: perfect ?? '' },
  ].filter((part) => part.value)

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-1.5" dir="ltr" lang={languageCode}>
        <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-xs font-semibold text-text-primary" dir="rtl" lang="ar">
          فعل
        </span>
        <span className="text-base font-semibold text-text-primary">{reading.lemma}</span>
      </div>
      <FormDescription reading={reading} />
      <LemmaTranslation reading={reading} />
      {parts.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {parts.map((part) => (
            <div key={part.label} className="contents">
              <dt className="text-text-secondary">{part.label}</dt>
              <dd className="font-medium text-text-primary" dir="ltr" lang={languageCode}>
                {part.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </>
  )
}

/**
 * Grammar of the clicked word as found in Wiktionary: the article and plural of a noun, the principal parts of a verb,
 * and for an inflected form ("gegangen", "Häuser") the lemma it belongs to with that lemma's meaning.
 */
export function GrammarReadings({ readings, languageCode }: GrammarReadingsProps) {
  if (readings.length === 0) return null
  return (
    <div role="group" aria-label="قواعد الكلمة" className="flex flex-col gap-2">
      {readings.map((reading, index) => (
        <div
          // The same lemma can appear twice with different articles, so the position is part of the key
          key={`${reading.kind}-${reading.lemma}-${index}`}
          className="flex flex-col gap-1 rounded-sm border border-border bg-surface p-2"
        >
          {reading.kind === 'noun' ? (
            <NounBlock reading={reading} languageCode={languageCode} />
          ) : (
            <VerbBlock reading={reading} languageCode={languageCode} />
          )}
        </div>
      ))}
    </div>
  )
}
