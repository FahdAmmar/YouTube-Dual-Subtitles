/**
 * استخراج معرّف فيديو Vimeo (Video ID) من رابط يُدخله المستخدم — نفس
 * الفلسفة الأمنية الصارمة المُطبَّقة تماماً في extractVideoId.ts (يوتيوب):
 * تحقق من قائمة نطاقات مسموحة صراحةً عبر واجهة URL القياسية، ثم تحقق من
 * أن المعرّف الناتج يطابق الصيغة الرقمية المعروفة لمعرّفات Vimeo، قبل أي
 * استخدام له في بناء عنصر iframe
 *
 * تجزئة الخصوصية (hash): فيديوهات Vimeo غير المُدرجة (Unlisted) — وهي
 * استخدام شائع جداً لـVimeo تحديداً (مشاركة فرق/عملاء خاصة، بخلاف يوتيوب
 * الذي يغلب عليه المحتوى العام) — لا تعمل بلا تمرير هذه التجزئة مع
 * المعرّف الرقمي معاً؛ تجاهلها يعني نجاح الاستخراج ظاهرياً بينما يفشل
 * التشغيل الفعلي لاحقاً برسالة "فيديو خاص" مُربكة للمستخدم
 */

// معرّفات Vimeo أرقام صرفة فقط (مثال: 76979871) — لا حروف ولا رموز إطلاقاً
const VIDEO_ID_PATTERN = /^\d+$/
// تجزئة الخصوصية أبجدية رقمية فقط بحسب صيغة Vimeo الفعلية
const HASH_PATTERN = /^[a-zA-Z0-9]+$/

// الأنماط المدعومة لروابط Vimeo المختلفة، مع التقاط تجزئة الخصوصية
// الاختيارية إن وُجدت كجزء من المسار (وليس فقط المعرّف الرقمي وحده)
const URL_PATTERNS: RegExp[] = [
  /vimeo\.com\/(\d+)(?:\/([a-zA-Z0-9]+))?/,
  /player\.vimeo\.com\/video\/(\d+)/,
]

export interface ExtractVideoIdResult {
  success: boolean
  videoId: string | null
  /** تجزئة الأمان لفيديوهات Vimeo غير المُدرجة — null للفيديوهات العامة العادية */
  hash: string | null
  error: string | null
}

export function extractVimeoVideoId(rawInput: string): ExtractVideoIdResult {
  const trimmed = rawInput.trim()

  if (!trimmed) {
    return { success: false, videoId: null, hash: null, error: 'الرجاء إدخال رابط الفيديو' }
  }

  // محاولة أولى: اعتبار المدخل رابطاً كاملاً وتحليله عبر واجهة URL القياسية
  let hostname = ''
  let hashFromQuery: string | null = null
  try {
    const url = new URL(trimmed)
    hostname = url.hostname.replace(/^www\./, '')
    const queryHash = url.searchParams.get('h')
    hashFromQuery = queryHash && HASH_PATTERN.test(queryHash) ? queryHash : null
  } catch {
    // المدخل ليس رابطاً كاملاً صالحاً (مثال: أدخل المستخدم المعرّف مباشرة)
  }

  const allowedHosts = new Set(['vimeo.com', 'player.vimeo.com'])
  if (hostname && !allowedHosts.has(hostname)) {
    return { success: false, videoId: null, hash: null, error: 'الرابط ليس رابط Vimeo صالحاً' }
  }

  for (const pattern of URL_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match?.[1] && VIDEO_ID_PATTERN.test(match[1])) {
      const pathHash = match[2]
      const hash = (pathHash && HASH_PATTERN.test(pathHash) ? pathHash : null) ?? hashFromQuery
      return { success: true, videoId: match[1], hash, error: null }
    }
  }

  // احتمال أن يكون المستخدم قد لصق المعرّف الرقمي مباشرة دون رابط كامل
  if (VIDEO_ID_PATTERN.test(trimmed)) {
    return { success: true, videoId: trimmed, hash: null, error: null }
  }

  return { success: false, videoId: null, hash: null, error: 'تعذّر التعرف على معرّف الفيديو من هذا الرابط' }
}
