import { useCallback, useEffect, useRef, useState } from 'react'
import { loadYouTubeIframeAPI } from '@/lib/youtube/loadYouTubeIframeAPI'
import { YT_PLAYER_STATE } from '@/types/youtube.types'
import type { YouTubePlayerInstance, YouTubePlayerState } from '@/types/youtube.types'

export interface UseYouTubePlayerResult {
  /** عنصر الحاوية الذي يجب ربطه بالـ DOM ليحل محله المشغّل */
  containerId: string
  duration: number
  playerState: YouTubePlayerState
  isReady: boolean
  loadError: string | null
  play: () => void
  pause: () => void
  seekTo: (seconds: number) => void
  toggleMute: () => void
  setVolume: (volume: number) => void
  /**
   * قراءة الوقت الحالي بشكل فوري (Imperative) دون إحداث إعادة رسم.
   * مصمم عمداً كدالة وليس قيمة حالة (state) — انظر usePlayerTime للتفاصيل
   */
  getCurrentTime: () => number
  /** قراءة فورية لحالة الصوت الحالية (تُستخدم لتهيئة شريط التحكم المخصص مرة واحدة عند الجاهزية) */
  getInitialAudioState: () => { isMuted: boolean; volume: number }
}

/**
 * Hook يغلّف دورة حياة مشغّل يوتيوب: التحميل، الإنشاء، التحكم، والتنظيف
 * (destroy) عند إلغاء تركيب المكوّن أو تغيّر معرّف الفيديو.
 *
 * قرار هندسي مهم: هذا الـ Hook لا "يستطلع" الوقت الحالي داخلياً كحالة
 * تفاعلية (useState) كما كان سابقاً. السبب: أي مكوّن يستدعي هذا الـ Hook
 * (وهو AppShell، أعلى الشجرة) كان سيُعاد رسمه بالكامل 8 مرات في الثانية
 * أثناء التشغيل. بدل ذلك، نُعيد getCurrentTime كدالة قراءة فورية فقط،
 * ويتولى usePlayerTime (المُستدعى فقط داخل المكوّنات التي تحتاج الوقت
 * فعلياً: شريط التحكم ولوحة النص المتزامن) مسؤولية الاشتراك في تغيّرات
 * الوقت عبر useSyncExternalStore، فتبقى إعادة الرسم الدورية معزولة.
 *
 * قرار هندسي ثانٍ: controls: 0 يُخفي واجهة تحكم يوتيوب الافتراضية
 * بالكامل. هذا ضروري لتحقيق تصميم واجهة تحكم مخصصة بالكامل (شريط تقدّم،
 * صوت، ملء شاشة بتصميمنا الخاص) — لكنه يعني أننا مسؤولون الآن عن توفير
 * كل وظيفة تحكم كانت يوتيوب توفرها افتراضياً (انظر VideoControlBar)
 */
export function useYouTubePlayer(videoId: string | null): UseYouTubePlayerResult {
  const containerId = useRef(`yt-player-${Math.random().toString(36).slice(2)}`).current
  const playerRef = useRef<YouTubePlayerInstance | null>(null)

  const [duration, setDuration] = useState(0)
  const [playerState, setPlayerState] = useState<YouTubePlayerState>(YT_PLAYER_STATE.UNSTARTED)
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!videoId) return

    let isCancelled = false
    setIsReady(false)
    setLoadError(null)

    loadYouTubeIframeAPI()
      .then(() => {
        if (isCancelled || !window.YT) return

        playerRef.current = new window.YT.Player(containerId, {
          videoId,
          // youtube-nocookie.com: وضع الخصوصية المعزز من يوتيوب نفسها —
          // لا يضع ملفات تعريف ارتباط لأغراض التتبع إلا بعد أن يتفاعل
          // المستخدم فعلياً مع الفيديو (تشغيل/إيقاف)
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            // إخفاء واجهة تحكم يوتيوب الافتراضية بالكامل لصالح شريط
            // التحكم المخصص (VideoControlBar) المطابق لتصميم لوحة التحكم
            controls: 0,
            disablekb: 1,
          },
          events: {
            onReady: (event) => {
              setIsReady(true)
              setDuration(event.target.getDuration())
            },
            onStateChange: (event) => {
              setPlayerState(event.data)
              if (event.data === YT_PLAYER_STATE.PLAYING) {
                setDuration(event.target.getDuration())
              }
            },
            onError: () => {
              setLoadError('تعذّر تشغيل هذا الفيديو (قد يكون غير متاح أو مقيّداً بالتضمين)')
            },
          },
        })
      })
      .catch(() => {
        if (!isCancelled) setLoadError('تعذّر تحميل مشغّل يوتيوب، تحقق من اتصالك بالإنترنت')
      })

    return () => {
      isCancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // دالة مستقرة (نفس المرجع بين عمليات إعادة الرسم) تقرأ الوقت الحالي
  // مباشرة من كائن المشغّل دون المرور بحالة React
  const getCurrentTime = useCallback(() => playerRef.current?.getCurrentTime() ?? 0, [])

  const toggleMute = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    if (player.isMuted()) {
      player.unMute()
    } else {
      player.mute()
    }
  }, [])

  const setVolume = useCallback((volume: number) => {
    const player = playerRef.current
    if (!player) return
    player.setVolume(volume)
    if (volume > 0 && player.isMuted()) player.unMute()
  }, [])

  const getInitialAudioState = useCallback(() => {
    const player = playerRef.current
    return {
      isMuted: player?.isMuted() ?? false,
      volume: player?.getVolume() ?? 100,
    }
  }, [])

  return {
    containerId,
    duration,
    playerState,
    isReady,
    loadError,
    play: () => playerRef.current?.playVideo(),
    pause: () => playerRef.current?.pauseVideo(),
    seekTo: (seconds: number) => playerRef.current?.seekTo(seconds, true),
    toggleMute,
    setVolume,
    getCurrentTime,
    getInitialAudioState,
  }
}
