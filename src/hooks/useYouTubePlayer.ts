import { useCallback, useEffect, useRef, useState } from 'react'
import { loadYouTubeIframeAPI } from '@/lib/youtube/loadYouTubeIframeAPI'
import { safePlayerCall } from '@/lib/utils/safePlayerCall'
import { YT_PLAYER_STATE } from '@/types/youtube.types'
import type { YouTubePlayerInstance, YouTubePlayerState } from '@/types/youtube.types'

// نطاق سرعة التشغيل المدعوم — يطابق المجموعة القياسية التي يدعمها يوتيوب
// فعلياً (0.25× إلى 2×)، ويتوافق تماماً مع خطوات ±0.5 المطلوبة من لوحة
// المفاتيح (1× → 1.5× → 2× والعكس)، فلا حاجة لاستدعاء
// getAvailablePlaybackRates (غير مدعومة على أي حال لكل الفيديوهات بنفس الشكل)
export const MIN_PLAYBACK_RATE = 0.25
export const MAX_PLAYBACK_RATE = 2

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
  /** سرعة التشغيل الحالية (1 = طبيعية)، مُدارة كحالة React لأنها تُعرض في الواجهة (شارة السرعة، تلميح لوحة المفاتيح) */
  playbackRate: number
  /** يضبط سرعة التشغيل مع تحديد النطاق تلقائياً ضمن [0.25×, 2×] */
  setPlaybackRate: (rate: number) => void
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
  const [playbackRate, setPlaybackRateState] = useState(1)

  useEffect(() => {
    if (!videoId) return

    let isCancelled = false
    setIsReady(false)
    setLoadError(null)
    // إعادة الضبط لسرعة التشغيل الطبيعية عند تحميل فيديو جديد — سلوك
    // متوقَّع (مطابق لسلوك يوتيوب نفسه ومعظم مشغّلات الفيديو الأخرى) بدل
    // توريث سرعة كانت مضبوطة للفيديو السابق
    setPlaybackRateState(1)

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
            // التحكم المخصص (VideoControlBar) المطابق لتصميم لوحة التحكم.
            // كما يُخلي الساحة تماماً لاختصارات لوحة المفاتيح المخصصة
            // (useKeyboardShortcuts: مسافة/c/x/f) دون أي تعارض مع اختصارات
            // يوتيوب الأصلية المدمجة في الـ iframe
            controls: 0,
            disablekb: 1,
          },
          events: {
            onReady: (event) => {
              setIsReady(true)
              setDuration(safePlayerCall(() => event.target.getDuration(), 0))
            },
            onStateChange: (event) => {
              setPlayerState(event.data)
              if (event.data === YT_PLAYER_STATE.PLAYING) {
                setDuration(safePlayerCall(() => event.target.getDuration(), 0))
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
      safePlayerCall(() => playerRef.current?.destroy(), undefined)
      playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // دالة مستقرة (نفس المرجع بين عمليات إعادة الرسم) تقرأ الوقت الحالي
  // مباشرة من كائن المشغّل دون المرور بحالة React
  //
  // إصلاح حرج (Bug Fix): هذه الدالة بالذات تُمرَّر مباشرة كـ getSnapshot
  // إلى useSyncExternalStore داخل usePlayerTime، والتي يستدعيها React أثناء
  // طور الرسم (Render) — أي استثناء غير محمي هنا يصل مباشرة إلى
  // ErrorBoundary ويستبدل الصفحة بأكملها. بما أن getCurrentTime() تعبر
  // فعلياً جسر postMessage نحو iframe مستضاف على domain يوتيوب، فهي عرضة
  // لانقطاعات حقيقية (تقييد تبويب غير نشط، انقطاع شبكة مؤقت...) تزداد
  // احتمالاً كلما طال زمن التشغيل — وهذا يفسّر تحديداً ظهور الخطأ "بعد
  // فترة من التشغيل" لا فور بدايته. safePlayerCall يضمن إرجاع آخر سلوك
  // آمن (0) بدل إسقاط التطبيق كله عند أي فشل مؤقت من هذا النوع
  const getCurrentTime = useCallback(() => safePlayerCall(() => playerRef.current?.getCurrentTime() ?? 0, 0), [])

  const toggleMute = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    safePlayerCall(() => {
      if (player.isMuted()) {
        player.unMute()
      } else {
        player.mute()
      }
    }, undefined)
  }, [])

  const setVolume = useCallback((volume: number) => {
    const player = playerRef.current
    if (!player) return
    safePlayerCall(() => {
      player.setVolume(volume)
      if (volume > 0 && player.isMuted()) player.unMute()
    }, undefined)
  }, [])

  const getInitialAudioState = useCallback(() => {
    const player = playerRef.current
    return {
      isMuted: safePlayerCall(() => player?.isMuted() ?? false, false),
      volume: safePlayerCall(() => player?.getVolume() ?? 100, 100),
    }
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    const clampedRate = Math.min(Math.max(rate, MIN_PLAYBACK_RATE), MAX_PLAYBACK_RATE)
    const player = playerRef.current
    if (!player) return
    safePlayerCall(() => player.setPlaybackRate(clampedRate), undefined)
    // نحدّث الحالة محلياً فوراً بدل انتظار حدث من يوتيوب (لا يوجد حدث
    // onPlaybackRateChange في الأنواع المُستخدمة هنا أصلاً — راجع مبدأ
    // YAGNI في youtube.types.ts)، فتبقى الواجهة متجاوبة فوراً مع كل ضغطة
    setPlaybackRateState(clampedRate)
  }, [])

  return {
    containerId,
    duration,
    playerState,
    isReady,
    loadError,
    play: () => safePlayerCall(() => playerRef.current?.playVideo(), undefined),
    pause: () => safePlayerCall(() => playerRef.current?.pauseVideo(), undefined),
    seekTo: (seconds: number) => safePlayerCall(() => playerRef.current?.seekTo(seconds, true), undefined),
    toggleMute,
    setVolume,
    playbackRate,
    setPlaybackRate,
    getCurrentTime,
    getInitialAudioState,
  }
}
