import type { VideoSource } from '@/types/video.types'

/**
 * مفتاح مستقر لكل فيديو: معرّف يوتيوب للفيديوهات القادمة من رابط (مستقر
 * تماماً بين الزيارات)، أو اسم الملف للفيديوهات المحلية — بما أن
 * objectUrl عشوائي ومؤقت (يُعاد إنشاؤه في كل جلسة عبر
 * URL.createObjectURL) فلا يصلح كمفتاح، بخلاف اسم الملف الذي يبقى نفسه
 * لو اختار المستخدم نفس الملف مرة أخرى لاحقاً
 *
 * مستخرج كدالة مشتركة (بدل تكراره) لأنه يُستخدم في أكثر من ميزة تخزين
 * محلي مرتبطة بهوية الفيديو: استئناف موضع التشغيل، وحفظ إزاحة تزامن الترجمة
 */
export function getVideoKey(source: VideoSource): string {
  return source.type === 'youtube' ? `youtube:${source.videoId}` : `local:${source.fileName}`
}
