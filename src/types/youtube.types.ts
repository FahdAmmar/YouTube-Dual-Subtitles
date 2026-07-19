/**
 * أنواع خاصة بتكامل يوتيوب داخل التطبيق
 * ملاحظة: هذه الأنواع تمثّل الحد الأدنى الذي يحتاجه التطبيق فعلياً من
 * YouTube IFrame Player API، وليست ترجمة كاملة لكل واجهة برمجة يوتيوب،
 * تجنباً لتضخيم الكود بأنواع غير مستخدمة (مبدأ YAGNI)
 */

/** حالات تشغيل المشغّل كما يرسلها YouTube IFrame API */
export const YT_PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const

export type YouTubePlayerState = (typeof YT_PLAYER_STATE)[keyof typeof YT_PLAYER_STATE]

/** واجهة الوظائف التي يستخدمها التطبيق فعلياً من كائن مشغّل يوتيوب */
export interface YouTubePlayerInstance {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): YouTubePlayerState
  mute(): void
  unMute(): void
  isMuted(): boolean
  setVolume(volume: number): void
  getVolume(): number
  setPlaybackRate(suggestedRate: number): void
  getPlaybackRate(): number
  getAvailableQualityLevels(): string[]
  setPlaybackQuality(quality: string): void
  getPlaybackQuality(): string
  destroy(): void
}

/** بنية الحدث الذي يُرسله المشغّل عند تغيّر حالته */
export interface YouTubeOnStateChangeEvent {
  data: YouTubePlayerState
  target: YouTubePlayerInstance
}

/** توسيع كائن window العام لإضافة كائن YT الذي يُحقن عبر سكربت يوتيوب الخارجي */
declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string
          host?: string
          playerVars?: Record<string, number | string>
          events?: {
            onReady?: (event: { target: YouTubePlayerInstance }) => void
            onStateChange?: (event: YouTubeOnStateChangeEvent) => void
            onError?: (event: { data: number }) => void
          }
        },
      ) => YouTubePlayerInstance
    }
    onYouTubeIframeAPIReady?: () => void
  }
}
