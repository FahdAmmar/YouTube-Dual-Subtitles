/** السمة المختارة صراحةً من المستخدم، أو الاعتماد على تفضيل النظام */
export type ThemePreference = 'light' | 'dark' | 'system'

/** السمة الفعلية المطبّقة حالياً بعد حل خيار "system" */
export type ResolvedTheme = 'light' | 'dark'

/** أي مسار (أو كلاهما) يُعرض حالياً فوق الفيديو وفي لوحة النص المتزامن */
export type ViewMode = 'both' | 'source' | 'translation'

/** إعدادات العرض الخاصة بمسار ترجمة واحد (قابلة للتخصيص من المستخدم) */
export interface SubtitleStyleSettings {
  /** حجم الخط بالبكسل */
  fontSize: number
  /** لون النص (قيمة CSS صالحة، مثال: "#E8B44C") */
  color: string
}

/** إعدادات العرض الكاملة لكلا مساري الترجمة، وتُحفظ في التخزين المحلي */
export interface SubtitleDisplaySettings {
  trackA: SubtitleStyleSettings
  trackB: SubtitleStyleSettings
  /** إظهار أو إخفاء خلفية شبه شفافة خلف نص الترجمة لتحسين وضوح القراءة */
  showBackdrop: boolean
}
