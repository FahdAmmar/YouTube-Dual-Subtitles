import { useCallback, useEffect, useRef, useState } from 'react'
import { loadVimeoPlayerAPI } from '@/lib/vimeo/loadVimeoPlayerAPI'
import { YT_PLAYER_STATE, type YouTubePlayerState } from '@/types/youtube.types'
import type { VimeoErrorPayload, VimeoPlayerInstance, VimeoTimeUpdatePayload } from '@/types/vimeo.types'

const GENERIC_LOAD_ERROR = 'تعذّر تشغيل هذا الفيديو (قد يكون خاصاً، محذوفاً، أو مقيَّد التضمين)'

export interface UseVimeoPlayerResult {
  /** عنصر الحاوية الذي يجب ربطه بالـ DOM ليحل محله المشغّل */
  containerId: string
  duration: number
  playerState: YouTubePlayerState
  isReady: boolean
  loadError: string | null
  /** عنوان الفيديو كما يُرسله Vimeo — يُستخدم في عرض سجل المشاهدات فقط */
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
 * محوّل Vimeo — يتّبع نفس نمط useYouTubePlayer تماماً (نفس الواجهة
 * المُعادة، نفس فلسفة التنظيف عند إلغاء التركيب)، بفارق جوهري واحد يجب
 * مراعاته في كل دالة هنا: واجهة Vimeo برمجية بالكامل غير متزامنة (كل شيء
 * Promise)، خلافاً ليوتيوب التي تُرجع قيماً مباشرة. الحل: تخزين آخر قيمة
 * معروفة (الوقت الحالي تحديداً) في مرجع (ref) يُحدَّث عبر حدث timeupdate،
 * بدل استدعاء getCurrentTime() بشكل متزامن كما يفعل يوتيوب — فهذا مطلوب
 * تحديداً لأن usePlayerTime يستدعي getCurrentTime حياً 5 مرات في الثانية
 * ولا يمكنها انتظار Promise في كل استدعاء
 */
export function useVimeoPlayer(videoId: string | null, hash: string | null): UseVimeoPlayerResult {
  const containerId = useRef(`vimeo-player-${Math.random().toString(36).slice(2)}`).current
  const playerRef = useRef<VimeoPlayerInstance | null>(null)
  const currentTimeRef = useRef(0)
  const isMutedRef = useRef(false)
  // نطاق موحّد 0-100 كبقية التطبيق (يوتيوب ومحلي)، رغم أن Vimeo نفسه يستخدم 0-1
  const volumeRef = useRef(100)

  const [duration, setDuration] = useState(0)
  const [playerState, setPlayerState] = useState<YouTubePlayerState>(YT_PLAYER_STATE.UNSTARTED)
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [videoTitle, setVideoTitle] = useState<string | null>(null)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [qualityLevels, setQualityLevels] = useState<string[]>([])
  const [currentQuality, setCurrentQuality] = useState('auto')

  useEffect(() => {
    if (!videoId) return

    let isCancelled = false
    setIsReady(false)
    setLoadError(null)
    setVideoTitle(null)
    setPlaybackRateState(1)
    setQualityLevels([])
    setCurrentQuality('auto')
    currentTimeRef.current = 0

    loadVimeoPlayerAPI()
      .then(() => {
        if (isCancelled || !window.Vimeo) return

        const player = new window.Vimeo.Player(containerId, {
          id: Number(videoId),
          h: hash ?? undefined,
          controls: false,
          keyboard: false,
          title: false,
          byline: false,
          portrait: false,
          dnt: true,
        })
        playerRef.current = player

        player.on('timeupdate', (payload) => {
          currentTimeRef.current = (payload as VimeoTimeUpdatePayload).seconds
        })
        player.on('play', () => setPlayerState(YT_PLAYER_STATE.PLAYING))
        player.on('pause', () => setPlayerState(YT_PLAYER_STATE.PAUSED))
        player.on('ended', () => setPlayerState(YT_PLAYER_STATE.ENDED))
        player.on('bufferstart', () => setPlayerState(YT_PLAYER_STATE.BUFFERING))
        player.on('error', (payload) => {
          if (isCancelled) return
          const error = payload as VimeoErrorPayload | undefined
          setLoadError(error?.message || GENERIC_LOAD_ERROR)
        })

        player
          .ready()
          .then(() =>
            Promise.all([
              player.getDuration(),
              player.getVideoTitle(),
              player.getVolume(),
              player.getMuted(),
              player.getQualities(),
            ]),
          )
          .then(([videoDuration, title, volume, muted, qualities]) => {
            if (isCancelled) return
            setIsReady(true)
            setDuration(videoDuration)
            setVideoTitle(title || null)
            volumeRef.current = Math.round(volume * 100)
            isMutedRef.current = muted
            setQualityLevels(qualities.map((q) => q.id))
            setCurrentQuality(qualities.find((q) => q.active)?.id ?? 'auto')
          })
          .catch(() => {
            if (!isCancelled) setLoadError(GENERIC_LOAD_ERROR)
          })
      })
      .catch(() => {
        if (!isCancelled) setLoadError('تعذّر تحميل مشغّل Vimeo، تحقق من اتصالك بالإنترنت')
      })

    return () => {
      isCancelled = true
      const player = playerRef.current
      playerRef.current = null
      if (player) {
        player.destroy().catch(() => {})
      }
    }
  }, [videoId, hash, containerId])

  const getCurrentTime = useCallback(() => currentTimeRef.current, [])
  const getVolume = useCallback(() => volumeRef.current, [])
  const getInitialAudioState = useCallback(
    () => ({ isMuted: isMutedRef.current, volume: volumeRef.current }),
    [],
  )

  const play = useCallback(() => {
    playerRef.current?.play().catch(() => {})
  }, [])

  const pause = useCallback(() => {
    playerRef.current?.pause().catch(() => {})
  }, [])

  const seekTo = useCallback((seconds: number) => {
    const player = playerRef.current
    if (!player) return
    player.setCurrentTime(seconds).catch(() => {})
    // تحديث فوري متفائل بدل انتظار Promise — يمنع تأخّراً محسوساً في
    // عرض الوقت الحالي بعد كل قفزة يدوية (نقر شريحة التقدّم أو اختصار)
    currentTimeRef.current = seconds
  }, [])

  const toggleMute = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    const nextMuted = !isMutedRef.current
    player
      .setMuted(nextMuted)
      .then(() => {
        isMutedRef.current = nextMuted
      })
      .catch(() => {})
  }, [])

  const setVolume = useCallback((volume: number) => {
    const player = playerRef.current
    if (!player) return
    const clamped = Math.min(Math.max(volume, 0), 100)
    player
      .setVolume(clamped / 100)
      .then(() => {
        volumeRef.current = clamped
      })
      .catch(() => {})
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate)
    // ملاحظة: تغيير سرعة التشغيل عبر Vimeo API يتطلب حساب Pro/Business —
    // يفشل بصمت لحسابات Vimeo المجانية بدل رمي خطأ غير مُعالَج؛ لا خيار
    // بديل ممكن من طرف العميل لهذا القيد
    playerRef.current?.setPlaybackRate(rate).catch(() => {})
  }, [])

  const setQuality = useCallback((quality: string) => {
    playerRef.current
      ?.setQuality(quality)
      .then((appliedQuality) => setCurrentQuality(appliedQuality))
      .catch(() => {})
  }, [])

  return {
    containerId,
    duration,
    playerState,
    isReady,
    loadError,
    videoTitle,
    play,
    pause,
    seekTo,
    toggleMute,
    setVolume,
    playbackRate,
    setPlaybackRate,
    getCurrentTime,
    getInitialAudioState,
    getVolume,
    qualityLevels,
    currentQuality,
    setQuality,
  }
}
