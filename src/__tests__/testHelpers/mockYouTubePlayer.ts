import type { YouTubePlayerInstance } from '@/types/youtube.types'

/** نفس نوع options الذي تتوقعه واجهة window.YT.Player الحقيقية تماماً — مُشتق مباشرة من التصريح العام في youtube.types.ts بدل تكراره أو اللجوء إلى any */
export type MockYouTubePlayerOptions = ConstructorParameters<NonNullable<Window['YT']>['Player']>[1]

/**
 * محاكٍ بسيط لمشغّل يوتيوب لاستخدامه في اختبارات jsdom، حيث لا يتوفر
 * سكربت يوتيوب الحقيقي (ولا الشبكة للوصول إليه أصلاً). يُنفّذ الحد الأدنى
 * من واجهة YouTubePlayerInstance المطلوبة فعلياً من قِبل useYouTubePlayer،
 * ويحاكي بدقة سلوكين حقيقيين مهمين للاختبار:
 * 1) استدعاء onReady بشكل غير متزامن (setTimeout) تماماً كما يفعل يوتيوب فعلياً
 * 2) إصدار onStateChange بحالة PLAYING عند استدعاء playVideo()، لتفعيل
 *    مسارات الكود التي تعتمد على isPlaying (مثل usePlayerTime)
 */
export class MockYouTubePlayer implements YouTubePlayerInstance {
  private time = 0
  private readonly options: MockYouTubePlayerOptions

  constructor(elementId: string, options: MockYouTubePlayerOptions) {
    const container = document.getElementById(elementId)
    if (!container) {
      throw new Error(`MockYouTubePlayer: container #${elementId} not found`)
    }
    this.options = options
    setTimeout(() => this.options.events?.onReady?.({ target: this }), 0)
  }

  setTime(seconds: number): void {
    this.time = seconds
  }

  getDuration(): number {
    return 120
  }

  getCurrentTime(): number {
    return this.time
  }

  getPlayerState(): 1 {
    return 1
  }

  playVideo(): void {
    // محاكاة سلوك يوتيوب الحقيقي: تشغيل الفيديو يُصدر onStateChange بحالة PLAYING
    this.options.events?.onStateChange?.({ data: 1, target: this })
  }

  pauseVideo(): void {}

  seekTo(seconds: number): void {
    this.time = seconds
  }

  mute(): void {}

  unMute(): void {}

  isMuted(): boolean {
    return false
  }

  setVolume(): void {}

  getVolume(): number {
    return 100
  }

  destroy(): void {}
}

/**
 * تركيب window.YT بالمحاكي أعلاه — يُستدعى من beforeEach في كل ملف اختبار
 * onInstanceCreated اختياري: يمرَّر إليه كل مشغّل جديد فور إنشائه، ليتمكن
 * الاختبار من الاحتفاظ بمرجع إليه (مثال: لاستدعاء setTime لاحقاً) دون
 * الحاجة لتوسيع الفئة يدوياً أو إسناد this إلى متغيّر محلي في كل ملف اختبار
 */
export function installMockYouTubeApi(onInstanceCreated?: (player: MockYouTubePlayer) => void): void {
  class TrackedMockYouTubePlayer extends MockYouTubePlayer {
    constructor(elementId: string, options: MockYouTubePlayerOptions) {
      super(elementId, options)
      onInstanceCreated?.(this)
    }
  }

  window.YT = { Player: TrackedMockYouTubePlayer }
}
