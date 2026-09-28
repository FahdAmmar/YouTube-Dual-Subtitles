/** معنى كلمة بلغة المستخدم (عادةً العربية) + تعريفات من ويكاموس */
export interface WordMeaning {
  partOfSpeech: string
  text: string
  example: string | null
}

export interface WordLookupResult {
  word: string
  /** الترجمة الأساسية إلى لغة المسار المرجعي، أو null إن لم تتوفر */
  translation: string | null
  /** ترجمات بديلة (حتى 3) */
  alternatives: string[]
  /** تعريفات ويكاموس (الإنجليزية غالباً)، حتى 3 */
  meanings: WordMeaning[]
}

export type LookupOutcome =
  | { kind: 'found'; result: WordLookupResult }
  | { kind: 'not-found' }
  | { kind: 'error' }

/** نتيجة مصدر واحد: بيانات، أو لا شيء (404/مطابق فارغ)، أو خطأ (شبكة/حصة/خادم) */
type Part<T> = { status: 'ok'; value: T } | { status: 'empty' } | { status: 'error' }

const MAX_ALTERNATIVES = 3
const MAX_MEANINGS = 3

// MyMemory يقبل أغلب رموز ISO 639-1 كما هي، عدا الصينية التي تحتاج صيغة إقليمية
const MYMEMORY_LANGUAGE_OVERRIDES: Record<string, string> = { zh: 'zh-CN' }

function toMyMemoryCode(code: string): string {
  return MYMEMORY_LANGUAGE_OVERRIDES[code] ?? code
}

/**
 * يحوّل HTML وارد من ويكاموس إلى نص خام. المحتوى خارجي غير موثوق، لذا
 * نستخرج textContent عبر DOMParser (لا ينفّذ سكربتات ولا يحمّل موارد)
 * ولا نمرّر الـHTML أبداً إلى dangerouslySetInnerHTML
 */
function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style').forEach((node) => node.remove())
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

interface RawWiktionaryEntry {
  partOfSpeech?: string
  definitions?: { definition?: string; examples?: string[] }[]
}

async function fetchWiktionaryMeanings(
  word: string,
  languageCode: string,
  signal?: AbortSignal,
): Promise<Part<WordMeaning[]>> {
  // الكلمة الألمانية في أول الجملة تُكتب بحرف كبير ("Perfekt")، بينما مدخل
  // الصفة "perfekt" صغير — نجرّب الشكلين ونجمع نتائجهما
  const variants = [...new Set([word, word.toLowerCase()])]
  const meanings: WordMeaning[] = []
  let hadError = false

  for (const variant of variants) {
    try {
      const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(variant)}`
      const response = await fetch(url, { signal })
      if (response.status === 404) continue
      if (!response.ok) {
        hadError = true
        continue
      }
      const data = (await response.json()) as Record<string, RawWiktionaryEntry[] | undefined>
      for (const entry of data[languageCode] ?? []) {
        const first = entry.definitions?.find((d) => d.definition && htmlToText(d.definition))
        if (!first?.definition) continue
        const text = htmlToText(first.definition)
        if (meanings.some((m) => m.text === text)) continue
        const example = first.examples?.[0] ? htmlToText(first.examples[0]) : ''
        meanings.push({ partOfSpeech: entry.partOfSpeech ?? '', text, example: example || null })
      }
    } catch {
      hadError = true
    }
  }

  if (meanings.length > 0) return { status: 'ok', value: meanings.slice(0, MAX_MEANINGS) }
  return hadError ? { status: 'error' } : { status: 'empty' }
}

interface RawMyMemoryResponse {
  responseStatus?: number | string
  responseData?: { translatedText?: string }
  matches?: { segment?: string; translation?: string }[]
}

async function fetchTranslation(
  word: string,
  fromLanguage: string,
  toLanguage: string,
  signal?: AbortSignal,
): Promise<Part<{ translation: string; alternatives: string[] }>> {
  try {
    const params = new URLSearchParams({
      q: word,
      langpair: `${toMyMemoryCode(fromLanguage)}|${toMyMemoryCode(toLanguage)}`,
    })
    const response = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal })
    if (!response.ok) return { status: 'error' }

    const data = (await response.json()) as RawMyMemoryResponse
    // 200 = نجاح؛ أي رمز آخر (مثل 429 عند استنفاد الحصة اليومية) خطأ لا "غياب ترجمة"
    if (Number(data.responseStatus) !== 200) return { status: 'error' }

    const translation = data.responseData?.translatedText?.trim() ?? ''
    if (!translation || translation.toUpperCase().startsWith('MYMEMORY WARNING')) {
      return { status: 'error' }
    }
    // ترجمة مطابقة للكلمة الأصلية تعني عملياً أن الخدمة لم تجد ترجمة
    if (translation.toLowerCase() === word.toLowerCase()) return { status: 'empty' }

    const alternatives = [
      ...new Set(
        (data.matches ?? [])
          .filter((m) => m.segment?.trim().toLowerCase() === word.toLowerCase())
          .map((m) => m.translation?.trim() ?? '')
          .filter((t) => t && t.length <= 40 && t !== translation && !t.toUpperCase().includes('MYMEMORY')),
      ),
    ].slice(0, MAX_ALTERNATIVES)

    return { status: 'ok', value: { translation, alternatives } }
  } catch {
    return { status: 'error' }
  }
}

/**
 * يبحث عن معنى كلمة من مصدرين بالتوازي: ترجمتها إلى لغة المستخدم
 * (MyMemory، تدعم عشرات اللغات) وتعريفاتها من ويكاموس (تدعم مئات اللغات).
 * أيٌّ من المصدرين يكفي لعرض نتيجة؛ ولا يُعاد "not-found" إلا إن لم يجد
 * أيٌّ منهما شيئاً *دون* أخطاء — أما الأخطاء (انقطاع الشبكة، حصة منتهية)
 * فتُعاد كـ"error" ليتمكن المستخدم من إعادة المحاولة بدل الاعتقاد بأن
 * الكلمة غير موجودة
 */
export async function lookupWord(
  word: string,
  learningLanguage: string,
  nativeLanguage?: string,
  signal?: AbortSignal,
): Promise<LookupOutcome> {
  const cleanedWord = word.trim()
  if (!cleanedWord) return { kind: 'not-found' }

  const canTranslate = Boolean(nativeLanguage) && nativeLanguage !== learningLanguage
  const [translationPart, meaningsPart] = await Promise.all([
    canTranslate
      ? fetchTranslation(cleanedWord, learningLanguage, nativeLanguage as string, signal)
      : Promise.resolve<Part<never>>({ status: 'empty' }),
    fetchWiktionaryMeanings(cleanedWord, learningLanguage, signal),
  ])

  const translation = translationPart.status === 'ok' ? translationPart.value : null
  const meanings = meaningsPart.status === 'ok' ? meaningsPart.value : []

  if (translation || meanings.length > 0) {
    return {
      kind: 'found',
      result: {
        word: cleanedWord,
        translation: translation?.translation ?? null,
        alternatives: translation?.alternatives ?? [],
        meanings,
      },
    }
  }

  const hadError = translationPart.status === 'error' || meaningsPart.status === 'error'
  return hadError ? { kind: 'error' } : { kind: 'not-found' }
}
