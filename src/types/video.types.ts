/**
 * مصدر الفيديو الذي يشاهده المستخدم حالياً — يوتيوب، Vimeo، أو ملف فيديو
 * محلي مرفوع من جهازه مباشرة. هذا النوع هو نقطة التفرّع الوحيدة في كامل
 * التطبيق بين المسارات الثلاثة؛ كل شيء آخر (شريط التحكم، الترجمة
 * المزدوجة، اختصارات لوحة المفاتيح...) يتعامل فقط مع الواجهة الموحّدة
 * التي يُعيدها useVideoPlayer، بلا أي علم بمصدر الفيديو الفعلي
 */
export type VideoSource =
  | { type: 'youtube'; videoId: string }
  | { type: 'vimeo'; videoId: string; hash: string | null }
  | { type: 'local'; objectUrl: string; fileName: string }
