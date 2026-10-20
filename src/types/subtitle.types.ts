/**
 * الأنواع الأساسية المتعلقة بملفات الترجمة (Subtitles)
 * هذا الملف هو مصدر الحقيقة الوحيد (Single Source of Truth) لبنية بيانات
 * الترجمة في كامل التطبيق، مما يضمن الاتساق بين المحلّل (Parser) والعرض (UI)
 */

/** كلمة واحدة مع لحظة بدء نطقها (بالثواني) — متوفرة فقط في ملفات VTT التلقائية من يوتيوب */
export interface CueWord {
  readonly text: string
  readonly start: number
}

/** مقطع ترجمة واحد: نص يظهر بين زمنين محددين (بالثواني) */
export interface SubtitleCue {
  /** زمن بداية ظهور المقطع، بالثواني */
  readonly start: number
  /** زمن نهاية ظهور المقطع، بالثواني */
  readonly end: number
  /** نص الترجمة (قد يحتوي على عدة أسطر مفصولة بـ \n) */
  readonly text: string
  /** توقيت كل كلمة إن وُجد في الملف؛ يطابق كلمات `text` بالترتيب تماماً أو يُحذف (انظر cueWords.ts) */
  readonly words?: readonly CueWord[]
}

/** الصيغ المدعومة لملفات الترجمة */
export type SubtitleFormat = 'srt' | 'vtt' | 'ass'

/** معرّف فريد لكل مسار ترجمة داخل التطبيق (المسار الأول أو الثاني) */
export type SubtitleTrackId = 'trackA' | 'trackB'

/** حالة مسار ترجمة واحد كما تُدار في الواجهة */
export interface SubtitleTrackState {
  /** اسم اللغة المعروض للمستخدم (مثال: "العربية") */
  languageLabel: string
  /** رمز اللغة وفق ISO 639-1 (مثال: "ar") — يُستخدم في خاصية lang و dir */
  languageCode: string
  /** اسم الملف الأصلي الذي رفعه المستخدم */
  fileName: string | null
  /** المقاطع بعد التحليل، مرتبة تصاعدياً حسب زمن البداية */
  cues: SubtitleCue[]
  /** حالة تحميل/تحليل الملف الحالية */
  status: 'empty' | 'parsing' | 'ready' | 'error'
  /** رسالة الخطأ إن وُجدت (لعرضها للمستخدم بشكل واضح) */
  errorMessage: string | null
  /**
   * إزاحة زمنية يدوية بالثواني (موجبة = تأخير ظهور الترجمة، سالبة = تقديمها)
   * تُستخدم لمعالجة عدم تطابق توقيت ملف الترجمة مع نسخة الفيديو المحددة
   * على يوتيوب — حالة شائعة جداً عند استخدام ملفات ترجمة من مصادر مختلفة.
   * لا تُحفظ في التخزين المحلي عمداً: هي خاصة بجلسة/ملف الترجمة الحالي
   * فقط، وتُصفَّر تلقائياً عند رفع ملف جديد (انظر useSubtitleTrack)
   */
  syncOffsetSeconds: number
}

/** مجموعة الإجراءات الخاصة بضبط الإزاحة الزمنية لمسار واحد — مشتركة بين لوحة التحكم والترجمة المُطبَّقة فوق الفيديو */
export interface TrackOffsetControls {
  nudgeSyncOffset: (direction: 1 | -1) => void
  resetSyncOffset: () => void
}

/**
 * إجراءات اختيار لغة مسار ترجمة صراحةً من القائمة (وضع "تلقائي" = null يعني
 * إعادة الكشف التلقائي عن لغة الملف). يفوق الاختيار الصريح نتيجة الكشف دائماً
 */
export interface TrackLanguageControls {
  /** الاختيار الحالي؛ null في وضع الكشف التلقائي */
  explicitCode: string | null
  onSelect: (code: string | null) => void
}

/** A word picked on the video, with the line it came from so a saved word can show its context */
export interface WordSelection {
  readonly word: string
  readonly sentence: string
  /** Video time (seconds) the line starts at */
  readonly time: number
}
