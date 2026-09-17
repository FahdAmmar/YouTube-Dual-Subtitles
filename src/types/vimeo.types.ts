/**
 * أنواع خاصة بتكامل Vimeo داخل التطبيق — نفس فلسفة youtube.types.ts
 * تماماً: الحد الأدنى الذي يحتاجه التطبيق فعلياً من Vimeo Player SDK
 * (player.js)، وليس ترجمة كاملة لكل واجهته (مبدأ YAGNI).
 *
 * فرق جوهري عن يوتيوب يجب معرفته قبل قراءة useVimeoPlayer: كل دوال Vimeo
 * تقريباً غير متزامنة (تُعيد Promise)، خلافاً لواجهة يوتيوب التي تُعيد
 * القيم مباشرة. هذا انعكاس لتصميم Vimeo نفسه (اتصال postMessage بحت مع
 * iframe، لا قراءة مباشرة لأي خاصية)، وليس اختياراً منا
 */

/** واجهة الوظائف التي يستخدمها التطبيق فعلياً من كائن مشغّل Vimeo */
export interface VimeoPlayerInstance {
  play(): Promise<void>
  pause(): Promise<void>
  getCurrentTime(): Promise<number>
  setCurrentTime(seconds: number): Promise<number>
  getDuration(): Promise<number>
  getVolume(): Promise<number>
  setVolume(volume: number): Promise<number>
  getMuted(): Promise<boolean>
  setMuted(muted: boolean): Promise<boolean>
  setPlaybackRate(rate: number): Promise<number>
  getPlaybackRate(): Promise<number>
  getQualities(): Promise<{ id: string; label: string; active: boolean }[]>
  setQuality(quality: string): Promise<string>
  getVideoTitle(): Promise<string>
  /** يتحقق (Promise) من اكتمال تهيئة المشغّل — اللحظة الآمنة لاستدعاء أي دالة قراءة أخرى بلا فشل */
  ready(): Promise<void>
  on(event: string, callback: (payload: VimeoTimeUpdatePayload | VimeoErrorPayload | undefined) => void): void
  off(event: string, callback?: (payload: unknown) => void): void
  destroy(): Promise<void>
}

/** حمولة حدث timeupdate — نعتمد seconds منها فقط لتحديث الوقت الحالي حياً */
export interface VimeoTimeUpdatePayload {
  seconds: number
  percent: number
  duration: number
}

/** حمولة حدث error كما يُرسلها Vimeo عند تعذّر تحميل الفيديو (خاص، محذوف، مقيَّد التضمين...) */
export interface VimeoErrorPayload {
  name: string
  message: string
}

/** خيارات إنشاء مشغّل Vimeo جديد داخل حاوية — مطابقة للحقول التي يستخدمها loadVimeoPlayerAPI/useVimeoPlayer فقط */
export interface VimeoPlayerOptions {
  id: number
  /** تجزئة الأمان المطلوبة لتشغيل فيديوهات Vimeo غير المُدرجة (Unlisted) فقط — انظر extractVimeoVideoId */
  h?: string
  controls?: boolean
  keyboard?: boolean
  title?: boolean
  byline?: boolean
  portrait?: boolean
  // وضع عدم التتبّع (Do Not Track) — يمنع Vimeo من وضع ملفات تعريف
  // ارتباط تحليلية، مطابقةً تماماً لروح استخدام youtube-nocookie.com
  dnt?: boolean
}

/** توسيع كائن window العام لإضافة كائن Vimeo الذي يُحقن عبر سكربت Vimeo الخارجي */
declare global {
  interface Window {
    Vimeo?: {
      Player: new (elementId: string, options: VimeoPlayerOptions) => VimeoPlayerInstance
    }
  }
}
