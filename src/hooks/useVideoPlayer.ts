import type { RefObject } from 'react'
import { useYouTubePlayer } from './useYouTubePlayer'
import { useVimeoPlayer } from './useVimeoPlayer'
import { useLocalVideoPlayer } from './useLocalVideoPlayer'
import type { VideoSource } from '@/types/video.types'
import type { YouTubePlayerState } from '@/types/youtube.types'

/** الوجهة التي يجب أن يُركَّب فيها المشغّل فعلياً — تختلف جوهرياً حسب مصدر الفيديو */
export type VideoRenderTarget =
  | { type: 'youtube'; containerId: string }
  | { type: 'vimeo'; containerId: string }
  | { type: 'local'; videoRef: RefObject<HTMLVideoElement>; objectUrl: string }

export interface UseVideoPlayerResult {
  renderTarget: VideoRenderTarget
  duration: number
  playerState: YouTubePlayerState
  isReady: boolean
  loadError: string | null
  /** عنوان الفيديو — متاح ليوتيوب وVimeo (فارغ للفيديو المحلي؛ اسم الملف نفسه يكفي كعنوان هناك) */
  videoTitle: string | null
  play: () => void
  pause: () => void
  seekTo: (seconds: number) => void
  toggleMute: () => void
  setVolume: (volume: number) => void
  playbackRate: number
  setPlaybackRate: (rate: number) => void
  getCurrentTime: () => number
  getInitialAudioState: () => { isMuted: boolean; volume: number }
  getVolume: () => number
  qualityLevels: string[]
  currentQuality: string
  setQuality: (quality: string) => void
}

/**
 * Hook مُجمِّع (Composite Hook) يقف فوق useYouTubePlayer وuseVimeoPlayer
 * وuseLocalVideoPlayer ويُعيد واجهة تحكّم واحدة موحّدة، بحيث لا يحتاج
 * VideoStage ولا VideoControlBar ولا SubtitleOverlay ولا
 * useKeyboardShortcuts لأي فرع شرطي بخصوص "أي مصدر فيديو هذا؟" — كل ما
 * تحتاجه هذه المكوّنات موجود بنفس الأسماء بالضبط بغض النظر عن المصدر.
 *
 * قرار هندسي مهم: الثلاثة Hooks تُستدعى دوماً (بلا شرط) — قاعدة React
 * الأساسية تمنع استدعاء الـ Hooks بشكل شرطي. كل Hook يبقى "خاملاً" تماماً
 * (لا يُنشئ أي مشغّل، لا يُسجّل أي مستمعين) طالما أن معامله (videoId أو
 * objectUrl) هو null — فلا تكلفة حقيقية على الأداء من استدعاء الثلاثة معاً
 */
export function useVideoPlayer(source: VideoSource | null): UseVideoPlayerResult {
  const youtubeVideoId = source?.type === 'youtube' ? source.videoId : null
  const vimeoVideoId = source?.type === 'vimeo' ? source.videoId : null
  const vimeoHash = source?.type === 'vimeo' ? source.hash : null
  const localObjectUrl = source?.type === 'local' ? source.objectUrl : null

  const youtubePlayer = useYouTubePlayer(youtubeVideoId)
  const vimeoPlayer = useVimeoPlayer(vimeoVideoId, vimeoHash)
  const localPlayer = useLocalVideoPlayer(localObjectUrl)

  if (source?.type === 'local') {
    return {
      ...localPlayer,
      renderTarget: { type: 'local', videoRef: localPlayer.videoRef, objectUrl: source.objectUrl },
      videoTitle: null,
      qualityLevels: [],
      currentQuality: 'native',
      setQuality: () => {},
    }
  }

  if (source?.type === 'vimeo') {
    const { containerId, ...rest } = vimeoPlayer
    return {
      ...rest,
      renderTarget: { type: 'vimeo', containerId },
    }
  }

  const { containerId, ...rest } = youtubePlayer
  return {
    ...rest,
    renderTarget: { type: 'youtube', containerId },
  }
}
