/**
 * استخراج معرّف فيديو يوتيوب (Video ID) من رابط يُدخله المستخدم
 *
 * أهمية أمنية: هذا المعرّف سيُستخدم لاحقاً لبناء رابط iframe المشغّل.
 * لذلك لا يكفي "استخراج" أي نص يشبه المعرّف، بل يجب التحقق الصارم من أن
 * الرابط المُدخل هو فعلاً رابط يوتيوب صالح، وأن المعرّف الناتج يطابق
 * الصيغة المعروفة لمعرّفات يوتيوب (11 حرفاً من [A-Za-z0-9_-])
 * هذا يمنع تمرير قيم غير متوقعة (XSS عبر السمة src أو حقن معاملات إضافية)
 */

// نمط معرّف فيديو يوتيوب الرسمي: 11 حرفاً بالضبط من هذه المجموعة
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

// الأنماط المدعومة لروابط يوتيوب المختلفة (عادي، مختصر، embed، shorts)
const URL_PATTERNS: RegExp[] = [
  /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
]

export interface ExtractVideoIdResult {
  success: boolean
  videoId: string | null
  error: string | null
}

export function extractYouTubeVideoId(rawInput: string): ExtractVideoIdResult {
  const trimmed = rawInput.trim()

  if (!trimmed) {
    return { success: false, videoId: null, error: 'الرجاء إدخال رابط الفيديو' }
  }

  // محاولة أولى: اعتبار المدخل رابطاً كاملاً وتحليله عبر واجهة URL القياسية
  // (أكثر دقة من الاعتماد على regex وحده لأنه يرفض الروابط المشوّهة تلقائياً)
  let hostname = ''
  try {
    const url = new URL(trimmed)
    hostname = url.hostname.replace(/^www\./, '')
  } catch {
    // المدخل ليس رابطاً كاملاً صالحاً (مثال: أدخل المستخدم المعرّف مباشرة)
  }

  const allowedHosts = new Set(['youtube.com', 'm.youtube.com', 'youtu.be'])
  if (hostname && !allowedHosts.has(hostname)) {
    return { success: false, videoId: null, error: 'الرابط ليس رابط يوتيوب صالحاً' }
  }

  for (const pattern of URL_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match?.[1] && VIDEO_ID_PATTERN.test(match[1])) {
      return { success: true, videoId: match[1], error: null }
    }
  }

  // احتمال أن يكون المستخدم قد لصق المعرّف مباشرة دون رابط كامل
  if (VIDEO_ID_PATTERN.test(trimmed)) {
    return { success: true, videoId: trimmed, error: null }
  }

  return { success: false, videoId: null, error: 'تعذّر التعرف على معرّف الفيديو من هذا الرابط' }
}
