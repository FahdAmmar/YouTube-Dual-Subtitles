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
}
