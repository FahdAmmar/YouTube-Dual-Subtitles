import type { VimeoErrorPayload, VimeoPlayerInstance, VimeoPlayerOptions, VimeoTimeUpdatePayload } from '@/types/vimeo.types'

type VimeoEventPayload = VimeoTimeUpdatePayload | VimeoErrorPayload | undefined
type VimeoEventCallback = (payload: VimeoEventPayload) => void

/**
 * محاكٍ بسيط لمشغّل Vimeo لاستخدامه في اختبارات jsdom، حيث لا يتوفر
 * سكربت Vimeo الحقيقي (ولا الشبكة للوصول إليه أصلاً). خلافاً لمحاكي
 * يوتيوب، كل دوال هذا المحاكي تُعيد Promise — مطابقةً لواجهة Vimeo
 * الحقيقية غير المتزامنة بالكامل (انظر توثيق vimeo.types.ts)
 */
export class MockVimeoPlayer implements VimeoPlayerInstance {
  private time = 0
  private readonly duration = 300
  private volume = 1
  private muted = false
  private rate = 1
  private readonly listeners = new Map<string, VimeoEventCallback[]>()
  private readonly options: VimeoPlayerOptions

  constructor(elementId: string, options: VimeoPlayerOptions) {
    const container = document.getElementById(elementId)
    if (!container) {
      throw new Error(`MockVimeoPlayer: container #${elementId} not found`)
    }
    this.options = options
  }

  on(event: string, callback: VimeoEventCallback): void {
    const listeners = this.listeners.get(event) ?? []
    listeners.push(callback)
    this.listeners.set(event, listeners)
  }

  // off() غير مُستخدَمة فعلياً في مسار الكود الحقيقي (التنظيف يتم عبر
  // destroy() فقط) — تبسيط بحذف كل مستمعي الحدث دفعة واحدة يكفي هنا
  off(event: string, _callback?: (payload: unknown) => void): void {
    this.listeners.delete(event)
  }

  private emit(event: string, payload?: VimeoEventPayload): void {
    for (const listener of this.listeners.get(event) ?? []) listener(payload)
  }

  ready(): Promise<void> {
    return Promise.resolve()
  }

  play(): Promise<void> {
    this.emit('play')
    return Promise.resolve()
  }

  pause(): Promise<void> {
    this.emit('pause')
    return Promise.resolve()
  }

  getCurrentTime(): Promise<number> {
    return Promise.resolve(this.time)
  }

  setCurrentTime(seconds: number): Promise<number> {
    this.time = seconds
    this.emitTimeUpdate()
    return Promise.resolve(seconds)
  }

  getDuration(): Promise<number> {
    return Promise.resolve(this.duration)
  }

  getVolume(): Promise<number> {
    return Promise.resolve(this.volume)
  }

  setVolume(volume: number): Promise<number> {
    this.volume = volume
    return Promise.resolve(volume)
  }

  getMuted(): Promise<boolean> {
    return Promise.resolve(this.muted)
  }

  setMuted(muted: boolean): Promise<boolean> {
    this.muted = muted
    return Promise.resolve(muted)
  }

  setPlaybackRate(rate: number): Promise<number> {
    this.rate = rate
    return Promise.resolve(rate)
  }

  getPlaybackRate(): Promise<number> {
    return Promise.resolve(this.rate)
  }

  getQualities(): Promise<{ id: string; label: string; active: boolean }[]> {
    return Promise.resolve([{ id: 'auto', label: 'تلقائي', active: true }])
  }

  setQuality(quality: string): Promise<string> {
    return Promise.resolve(quality)
  }

  getVideoTitle(): Promise<string> {
    return Promise.resolve('فيديو Vimeo تجريبي للاختبار')
  }

  destroy(): Promise<void> {
    this.listeners.clear()
    return Promise.resolve()
  }

  // --- أدوات مساعدة للاختبارات فقط (ليست جزءاً من واجهة Vimeo الحقيقية) ---

  /** يستدعيها الاختبار مباشرة لمحاكاة تقدّم التشغيل الحي (timeupdate) */
  setTime(seconds: number): void {
    this.time = seconds
    this.emitTimeUpdate()
  }

  /** يستدعيها الاختبار لمحاكاة فشل التحميل (فيديو خاص/محذوف/مقيَّد التضمين) */
  simulateError(message = 'هذا الفيديو غير متاح'): void {
    this.emit('error', { name: 'PrivacyError', message })
  }

  /** يتيح للاختبار قراءة الخيارات (id، h) التي أُنشئ بها المشغّل فعلياً */
  getOptions(): VimeoPlayerOptions {
    return this.options
  }

  private emitTimeUpdate(): void {
    this.emit('timeupdate', { seconds: this.time, percent: this.time / this.duration, duration: this.duration })
  }
}

/**
 * تركيب window.Vimeo بالمحاكي أعلاه — يُستدعى من beforeEach في كل ملف اختبار.
 * onInstanceCreated اختياري: يمرَّر إليه كل مشغّل جديد فور إنشائه، بنفس
 * نمط installMockYouTubeApi تماماً
 */
export function installMockVimeoApi(onInstanceCreated?: (player: MockVimeoPlayer) => void): void {
  class TrackedMockVimeoPlayer extends MockVimeoPlayer {
    constructor(elementId: string, options: VimeoPlayerOptions) {
      super(elementId, options)
      onInstanceCreated?.(this)
    }
  }

  window.Vimeo = { Player: TrackedMockVimeoPlayer }
}
