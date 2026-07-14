import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { safePlayerCall } from '@/lib/utils/safePlayerCall'
import { MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE } from './useYouTubePlayer'
import { YT_PLAYER_STATE } from '@/types/youtube.types'
import type { YouTubePlayerState } from '@/types/youtube.types'

export interface UseLocalVideoPlayerResult {
  /** مرجع عنصر <video> الفعلي — يجب ربطه بعنصر <video> في الشجرة كي يعمل هذا الـ Hook */
  videoRef: RefObject<HTMLVideoElement>
  duration: number
  playerState: YouTubePlayerState
  isReady: boolean
  loadError: string | null
  play: () => void
  pause: () => void
  seekTo: (seconds: number) => void
  toggleMute: () => void
  setVolume: (volume: number) => void
  playbackRate: number
  setPlaybackRate: (rate: number) => void
  getCurrentTime: () => number
  getInitialAudioState: () => { isMuted: boolean; volume: number }
}

/** ترجمة رمز خطأ عنصر <video> القياسي إلى رسالة عربية مفهومة للمستخدم */
function describeMediaError(error: MediaError | null): string {
  if (!error) return 'تعذّر تشغيل هذا الملف'
  switch (error.code) {
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return 'صيغة هذا الملف غير مدعومة في متصفحك — جرّب تحويله إلى MP4 أو WebM'
    case MediaError.MEDIA_ERR_DECODE:
      return 'تعذّر فك ترميز هذا الملف — قد يكون تالفاً'
    case MediaError.MEDIA_ERR_NETWORK:
      return 'حدث خطأ أثناء قراءة الملف'
    default:
      return 'تعذّر تشغيل هذا الملف'
  }
}

/**
 * Hook يشغّل ملف فيديو محلي (عبر Object URL منشأ من File مباشرة) باستخدام
 * عنصر <video> قياسي في HTML5 بدل واجهة يوتيوب الخارجية.
 *
 * قرار معماري أساسي: هذا الـ Hook يُعيد بالضبط نفس "شكل" النتيجة الذي
 * يُعيده useYouTubePlayer (نفس أسماء الحقول والدوال) عمداً — بحيث يستطيع
 * useVideoPlayer (المُجمِّع فوق كليهما) تقديم واجهة موحّدة واحدة لبقية
 * التطبيق (شريط التحكم، الترجمة المزدوجة، اختصارات لوحة المفاتيح...)، فلا
 * تحتاج تلك المكوّنات لمعرفة نوع مصدر الفيديو إطلاقاً. الفرق الوحيد بين
 * الهوكين هو videoRef (بدل containerId)، لأن آلية "الحاوية" التي تُركَّب
 * فيها كل تقنية تختلف جوهرياً (iframe يوتيوب مقابل عنصر <video> مباشر)
 */
export function useLocalVideoPlayer(objectUrl: string | null): UseLocalVideoPlayerResult {
  const videoRef = useRef<HTMLVideoElement>(null)

  const [duration, setDuration] = useState(0)
  const [playerState, setPlayerState] = useState<YouTubePlayerState>(YT_PLAYER_STATE.UNSTARTED)
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [playbackRate, setPlaybackRateState] = useState(1)

  useEffect(() => {
    const video = videoRef.current
    if (!objectUrl || !video) return

    setIsReady(false)
    setLoadError(null)
    setPlaybackRateState(1)

    function handleLoadedMetadata() {
      setDuration(safePlayerCall(() => video!.duration || 0, 0))
      setIsReady(true)
      // الحالة الأقرب مفاهيمياً لـ CUED في يوتيوب: مُحمَّل وجاهز، لم يبدأ التشغيل بعد
      setPlayerState(YT_PLAYER_STATE.PAUSED)
    }
    function handlePlay() {
      setPlayerState(YT_PLAYER_STATE.PLAYING)
    }
    function handlePause() {
      setPlayerState(YT_PLAYER_STATE.PAUSED)
    }
    function handleEnded() {
      setPlayerState(YT_PLAYER_STATE.ENDED)
    }
    function handleError() {
      setLoadError(describeMediaError(video!.error))
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
    }
  }, [objectUrl])

  const getCurrentTime = useCallback(() => safePlayerCall(() => videoRef.current?.currentTime ?? 0, 0), [])

  const play = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const playResult = video.play()
    // video.play() تُعيد Promise حسب المعيار الحديث، قد يُرفض (مثال:
    // NotAllowedError بسبب سياسات التشغيل التلقائي في المتصفح، أو
    // AbortError إذا استُدعيت pause() بسرعة بعدها مباشرة) — تجاهل الرفض
    // بأمان بدل ترك Unhandled Promise Rejection يظهر في طرفية المتصفح.
    // التحقق من وجود catch أولاً ضروري: بعض البيئات غير القياسية (jsdom في
    // الاختبارات مثلاً) لا تُعيد Promise فعلياً رغم أن كل المتصفحات
    // الحديثة تفعل — استدعاء catch على undefined مباشرة كان سيُسقط التطبيق
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {})
    }
  }, [])

  const pause = useCallback(() => {
    safePlayerCall(() => videoRef.current?.pause(), undefined)
  }, [])

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return
    safePlayerCall(() => {
      video.currentTime = seconds
    }, undefined)
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    safePlayerCall(() => {
      video.muted = !video.muted
    }, undefined)
  }, [])

  const setVolume = useCallback((volume: number) => {
    const video = videoRef.current
    if (!video) return
    safePlayerCall(() => {
      // خاصية volume في <video> نطاقها [0,1]؛ بقية التطبيق يتعامل بنطاق
      // [0,100] (مطابقةً لاتفاقية YouTube API) — التحويل هنا فقط
      video.volume = Math.min(Math.max(volume, 0), 100) / 100
      if (volume > 0 && video.muted) video.muted = false
    }, undefined)
  }, [])

  const getInitialAudioState = useCallback(() => {
    const video = videoRef.current
    return {
      isMuted: safePlayerCall(() => video?.muted ?? false, false),
      volume: safePlayerCall(() => Math.round((video?.volume ?? 1) * 100), 100),
    }
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    const clampedRate = Math.min(Math.max(rate, MIN_PLAYBACK_RATE), MAX_PLAYBACK_RATE)
    const video = videoRef.current
    if (video) safePlayerCall(() => (video.playbackRate = clampedRate), undefined)
    setPlaybackRateState(clampedRate)
  }, [])

  return {
    videoRef,
    duration,
    playerState,
    isReady,
    loadError,
    play,
    pause,
    seekTo,
    toggleMute,
    setVolume,
    playbackRate,
    setPlaybackRate,
    getCurrentTime,
    getInitialAudioState,
  }
}
