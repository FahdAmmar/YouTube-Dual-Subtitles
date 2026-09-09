/**
 * إشارة خفيفة لمصدر فيديو ضمن سجل المشاهدات — بخلاف VideoSource الحيّ،
 * لا تحمل أي مرجع Object URL (يموت مع إغلاق التبويب فلا معنى لتخزينه)،
 * بل فقط ما يكفي لإعادة بناء VideoSource لاحقاً: معرّف يوتيوب مباشرة، أو
 * اسم الملف المحلي (لإظهاره للمستخدم كتذكير عند إعادة اختياره يدوياً)
 */
export type HistorySourceRef = { type: 'youtube'; videoId: string } | { type: 'local'; fileName: string }

/** مُدخل واحد في سجل المشاهدات — فيديو واحد بكل ما يلزم لعرضه واستئنافه */
export interface WatchHistoryEntry {
  /** نفس مفتاح getVideoKey — يربط هذا المُدخل بسجلّي التقدّم وإزاحة التزامن الموجودَين أصلاً */
  videoKey: string
  source: HistorySourceRef
  /** عنوان يوتيوب الفعلي، أو اسم الملف المحلي إن لم يتوفر عنوان */
  displayName: string
  /** صورة مصغّرة ليوتيوب فقط (رابط عام قياسي، لا يحتاج مفتاح API) */
  thumbnailUrl?: string
  lastWatchedAt: number
  /**
   * أسماء ملفات الترجمة المستخدمة آخر مرة لهذا الفيديو تحديداً — تُعرَض
   * كتذكير عند العودة (لا يمكن إعادة فتحها تلقائياً؛ قيد أمان المتصفح
   * الأساسي يمنع أي موقع من الوصول لملف على القرص بلا اختيار المستخدم
   * له صراحةً في كل مرة)
   */
  subtitleFileNames: {
    source?: string
    translation?: string
  }
}
