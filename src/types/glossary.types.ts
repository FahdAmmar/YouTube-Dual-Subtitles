/** مُدخل واحد في المفردات الشخصية — كلمة محفوظة من نتيجة بحث قاموس ناجحة */
export interface GlossaryEntry {
  /** المفتاح الفريد للمُدخل — languageCode + الكلمة بأحرف صغيرة، يمنع تكرار نفس الكلمة مرتين */
  id: string
  word: string
  languageCode: string
  partOfSpeech: string
  /** الترجمة إلى لغة المستخدم؛ اختيارية لأن المُدخلات المحفوظة قبل هذه الميزة لا تحملها */
  translation?: string | null
  /** أفضل تعريف متاح (قد يكون فارغاً إن توفرت الترجمة فقط) */
  definition: string
  example: string | null
  addedAt: number
  /** Where the word was met, so a review can show it in its real sentence. Absent for older entries. */
  context?: GlossaryContext
  /** Spaced-repetition state. Absent means the word was never reviewed. */
  review?: GlossaryReview
}

export interface GlossaryContext {
  sentence: string
  /** Same key as watch history (see videoKey.ts): lets the app tell whether this is the video now playing */
  videoKey: string
  /** Start of the line in the video, in seconds */
  time: number
}

export interface GlossaryReview {
  /** Leitner box: 0 = just learned or forgotten, higher = better known */
  box: number
  dueAt: number
  lastReviewedAt: number
}

export type ReviewGrade = 'again' | 'good' | 'easy'
