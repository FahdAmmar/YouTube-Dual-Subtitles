import { useCallback, useRef, useState } from 'react'
import { Play, Pause, FastForward, Rewind, Maximize, Minimize, RotateCcw, SkipBack, SkipForward, Volume2, Volume1, Repeat, AlertCircle } from 'lucide-react'
import { YouTubePlayerView } from './YouTubePlayerView'
import { LocalVideoPlayerView } from './LocalVideoPlayerView'
import { VideoTopBar } from './VideoTopBar'
import { VideoControlBar } from './VideoControlBar'
import { SubtitleOverlay } from './SubtitleOverlay'
import { PlaybackShortcutToast, type PlaybackShortcutFeedback } from './PlaybackShortcutToast'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useFocusRetention } from '@/hooks/useFocusRetention'
import { useSceneRepeat } from '@/hooks/useSceneRepeat'
import type { UseVideoPlayerResult } from '@/hooks/useVideoPlayer'
import { MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE } from '@/hooks/useYouTubePlayer'
import { formatPlaybackRate } from '@/lib/utils/formatPlaybackRate'
import type { SubtitleTrackState } from '@/types/subtitle.types'
import type { ViewMode } from '@/types/theme.types'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import { YT_PLAYER_STATE } from '@/types/youtube.types'

interface VideoStageProps {
  player: UseVideoPlayerResult
  sourceTrack: SubtitleTrackState
  translationTrack: SubtitleTrackState
  viewMode: ViewMode
  onChangeVideo: () => void
  slices: PairedSlice[]
}

let shortcutFeedbackIdCounter = 0

/**
 * "مسرح" الفيديو الكامل — يجمع في حاوية واحدة قابلة لملء الشاشة:
 * المشغّل نفسه، الشريط العلوي (عودة + شارة اللغة)، الترجمة المزدوجة
 * المُطبَّقة فوق الفيديو، وشريط التحكم المخصص أسفله. تجميع كل هذه الطبقات
 * ضمن عنصر واحد (بدل توزيعها في الشجرة) ضروري لأن Fullscreen API يعمل
 * على عنصر DOM واحد — يجب أن يشمل ملء الشاشة كل هذه الطبقات معاً
 *
 * يستضيف أيضاً اختصارات لوحة المفاتيح الخاصة بالفيديو (useKeyboardShortcuts)
 * لأنه المكان الطبيعي الوحيد الذي تتوفر فيه كل عناصر التحكم اللازمة معاً
 * (المشغّل، حالة ملء الشاشة) في مكوّن واحد
 */
export function VideoStage({ player, sourceTrack, translationTrack, viewMode, onChangeVideo, slices }: VideoStageProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, toggleFullscreen } = useFullscreen(stageRef)
  const [shortcutFeedback, setShortcutFeedback] = useState<PlaybackShortcutFeedback | null>(null)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slicesRef = useRef(slices)
  slicesRef.current = slices
  // مرجع لآخر حالة للاعب — يسمح بالوصول لدوال player المستقرة دون
  // إعادة بناء callbacks عند كل إعادة رسم (player هو كائن جديد كل مرة)
  const playerRef = useRef(player)
  playerRef.current = player

  const isPlaying = player.playerState === YT_PLAYER_STATE.PLAYING

  // استعادة التركيز من iframe يوتيوب بعد كل تفاعل pointer — يضمن استجابة
  // اختصارات لوحة المفاتيح دوماً (انظر useFocusRetention للتفاصيل)
  useFocusRetention(stageRef, player.isReady)

  // إدارة تكرار المشهد (اختصارات 0/1/2/3) — معزول عن بقية الشجرة عبر
  // استطلاع مستقل بـ setInterval داخلياً، فلا يُعيد رسم المكوّنات الأخرى
  // عند كل نبضة وقت. نُفكِّك المراجع المستقرة (findCurrentScene/restartScene/
  // repeatScene) كاعتماديات للمعالجات بدل كائن sceneRepeat كاملاً، فلا تُعاد
  // بناء المعالجات إلا عند الحاجة الفعلية (لا عند كل إعادة رسم)
  const { repeatState: sceneRepeatState, findCurrentScene, restartScene, repeatScene } = useSceneRepeat(
    player,
    slices,
    isPlaying,
  )

  // يعرض تغذية راجعة لحظية (وميض أيقونة) لمدة قصيرة ثم يُخفيها تلقائياً؛
  // يُعيد ضبط المؤقّت في كل استدعاء حتى تبقى الأيقونة ظاهرة عند الضغط
  // المتكرر السريع على نفس الاختصار (مثال: c عدة مرات متتالية)
  const showShortcutFeedback = useCallback((label: string, icon: PlaybackShortcutFeedback['icon']) => {
    shortcutFeedbackIdCounter += 1
    setShortcutFeedback({ id: shortcutFeedbackIdCounter, label, icon })
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(() => setShortcutFeedback(null), 700)
  }, [])

  const handleTogglePlayPause = useCallback(() => {
    const p = playerRef.current
    if (isPlaying) {
      p.pause()
      showShortcutFeedback('إيقاف مؤقت', <Pause size={20} aria-hidden="true" />)
    } else {
      p.play()
      showShortcutFeedback('تشغيل', <Play size={20} aria-hidden="true" />)
    }
  }, [isPlaying, showShortcutFeedback])

  const handleSpeedUp = useCallback(() => {
    const p = playerRef.current
    const nextRate = p.playbackRate + 0.5
    p.setPlaybackRate(nextRate)
    showShortcutFeedback(
      formatPlaybackRate(Math.min(nextRate, MAX_PLAYBACK_RATE)),
      <FastForward size={20} aria-hidden="true" />,
    )
  }, [showShortcutFeedback])

  const handleSlowDown = useCallback(() => {
    const p = playerRef.current
    const nextRate = p.playbackRate - 0.5
    p.setPlaybackRate(nextRate)
    showShortcutFeedback(
      formatPlaybackRate(Math.max(nextRate, MIN_PLAYBACK_RATE)),
      <Rewind size={20} aria-hidden="true" />,
    )
  }, [showShortcutFeedback])

  const handleToggleFullscreenShortcut = useCallback(() => {
    toggleFullscreen()
    showShortcutFeedback(
      isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة',
      isFullscreen ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />,
    )
  }, [toggleFullscreen, isFullscreen, showShortcutFeedback])

  const handleResetSpeed = useCallback(() => {
    playerRef.current.setPlaybackRate(1)
    showShortcutFeedback('1×', <RotateCcw size={20} aria-hidden="true" />)
  }, [showShortcutFeedback])

  const handlePrevScene = useCallback(() => {
    const p = playerRef.current
    const currentSlices = slicesRef.current
    const currentTime = p.getCurrentTime()
    const currentIndex = currentSlices.findIndex((s) => currentTime >= s.start && currentTime < s.end)
    const targetIndex = currentIndex > 0 ? currentIndex - 1 : 0
    if (currentSlices[targetIndex]) {
      p.seekTo(currentSlices[targetIndex].start)
      showShortcutFeedback(`المقطع ${targetIndex + 1}`, <SkipBack size={20} aria-hidden="true" />)
    }
  }, [showShortcutFeedback])

  const handleNextScene = useCallback(() => {
    const p = playerRef.current
    const currentSlices = slicesRef.current
    const currentTime = p.getCurrentTime()
    const currentIndex = currentSlices.findIndex((s) => currentTime >= s.start && currentTime < s.end)
    const targetIndex = currentIndex < currentSlices.length - 1 ? currentIndex + 1 : currentSlices.length - 1
    if (currentSlices[targetIndex]) {
      p.seekTo(currentSlices[targetIndex].start)
      showShortcutFeedback(`المقطع ${targetIndex + 1}`, <SkipForward size={20} aria-hidden="true" />)
    }
  }, [showShortcutFeedback])

  const VOLUME_STEP = 10
  const handleVolumeUp = useCallback(() => {
    const p = playerRef.current
    const newVolume = Math.min(100, p.getVolume() + VOLUME_STEP)
    p.setVolume(newVolume)
    showShortcutFeedback(`${newVolume}%`, <Volume2 size={20} aria-hidden="true" />)
  }, [showShortcutFeedback])

  const handleVolumeDown = useCallback(() => {
    const p = playerRef.current
    const newVolume = Math.max(0, p.getVolume() - VOLUME_STEP)
    p.setVolume(newVolume)
    showShortcutFeedback(`${newVolume}%`, <Volume1 size={20} aria-hidden="true" />)
  }, [showShortcutFeedback])

  // اختصار "0": إعادة تشغيل المقطع الحالي من بدايته (مرة واحدة، بلا تكرار)
  const handleRestartScene = useCallback(() => {
    const scene = findCurrentScene()
    if (!scene) {
      showShortcutFeedback('لا يوجد مقطع', <AlertCircle size={20} aria-hidden="true" />)
      return
    }
    restartScene(scene)
    showShortcutFeedback('إعادة من البداية', <RotateCcw size={20} aria-hidden="true" />)
  }, [findCurrentScene, restartScene, showShortcutFeedback])

  // اختصارات "1"/"2"/"3": تكرار المقطع الحالي 2/3/4 مرات على التوالي
  const handleRepeatScene = useCallback(
    (totalLoops: number) => {
      const scene = findCurrentScene()
      if (!scene) {
        showShortcutFeedback('لا يوجد مقطع', <AlertCircle size={20} aria-hidden="true" />)
        return
      }
      repeatScene(scene, totalLoops)
      showShortcutFeedback(`تكرار ${totalLoops}×`, <Repeat size={20} aria-hidden="true" />)
    },
    [findCurrentScene, repeatScene, showShortcutFeedback],
  )

  useKeyboardShortcuts(player.isReady, {
    onTogglePlayPause: handleTogglePlayPause,
    onSpeedUp: handleSpeedUp,
    onSlowDown: handleSlowDown,
    onToggleFullscreen: handleToggleFullscreenShortcut,
    onResetSpeed: handleResetSpeed,
    onPrevScene: handlePrevScene,
    onNextScene: handleNextScene,
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown,
    onRestartScene: handleRestartScene,
    onRepeatScene: handleRepeatScene,
  })

  return (
    <div
      ref={stageRef}
      tabIndex={-1}
      className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-elevated outline-none"
    >
      {player.renderTarget.type === 'youtube' ? (
        <YouTubePlayerView
          containerId={player.renderTarget.containerId}
          isReady={player.isReady}
          loadError={player.loadError}
        />
      ) : (
        <LocalVideoPlayerView
          videoRef={player.renderTarget.videoRef}
          objectUrl={player.renderTarget.objectUrl}
          isReady={player.isReady}
          loadError={player.loadError}
        />
      )}

      {player.isReady && (
        <>
          <VideoTopBar languageCode={sourceTrack.languageCode} onBack={onChangeVideo} />

          {/* مؤشر تكرار المشهد النشط — يبقى ظاهراً طوال فترة التكرار
              ليُذكِّر المستخدم بأن المقطع الحالي يُعاد تشغيله N مرات،
              ويُوضّح التقدّم (المرّة الحالية من إجمالي المرّات) */}
          {sceneRepeatState && (
            <div className="pointer-events-none absolute end-3 top-14 z-10 flex items-center gap-1.5 rounded-md bg-black/75 px-2.5 py-1 font-mono text-[11px] tabular-nums text-white shadow-elevated backdrop-blur-sm">
              <Repeat size={12} className="text-console" aria-hidden="true" />
              <span aria-live="polite">
                {`${sceneRepeatState.totalLoops - sceneRepeatState.remainingLoops + 1}/${sceneRepeatState.totalLoops}`}
              </span>
            </div>
          )}

          <SubtitleOverlay
            sourceTrack={sourceTrack}
            translationTrack={translationTrack}
            getCurrentTime={player.getCurrentTime}
            isPlaying={isPlaying}
            viewMode={viewMode}
            stageRef={stageRef}
          />

          <PlaybackShortcutToast feedback={shortcutFeedback} />

          <div className="absolute inset-x-0 bottom-0">
            <VideoControlBar
              playerState={player.playerState}
              duration={player.duration}
              getCurrentTime={player.getCurrentTime}
              onPlay={player.play}
              onPause={player.pause}
              onSeek={player.seekTo}
              onToggleMute={player.toggleMute}
              onSetVolume={player.setVolume}
              initialAudioState={player.getInitialAudioState()}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              playbackRate={player.playbackRate}
              onSetPlaybackRate={player.setPlaybackRate}
              qualityLevels={player.qualityLevels}
              currentQuality={player.currentQuality}
              onSetQuality={player.setQuality}
            />
          </div>
        </>
      )}
    </div>
  )
}
