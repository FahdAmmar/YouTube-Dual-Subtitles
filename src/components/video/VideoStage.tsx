import { useCallback, useRef, useState } from 'react'
import { Play, Pause, FastForward, Rewind, Maximize, Minimize } from 'lucide-react'
import { YouTubePlayerView } from './YouTubePlayerView'
import { VideoTopBar } from './VideoTopBar'
import { VideoControlBar } from './VideoControlBar'
import { SubtitleOverlay } from './SubtitleOverlay'
import { PlaybackShortcutToast, type PlaybackShortcutFeedback } from './PlaybackShortcutToast'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import type { UseYouTubePlayerResult } from '@/hooks/useYouTubePlayer'
import { MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE } from '@/hooks/useYouTubePlayer'
import { formatPlaybackRate } from '@/lib/utils/formatPlaybackRate'
import type { SubtitleTrackState } from '@/types/subtitle.types'
import type { ViewMode } from '@/types/theme.types'
import { YT_PLAYER_STATE } from '@/types/youtube.types'

interface VideoStageProps {
  player: UseYouTubePlayerResult
  sourceTrack: SubtitleTrackState
  translationTrack: SubtitleTrackState
  viewMode: ViewMode
  onChangeVideo: () => void
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
export function VideoStage({ player, sourceTrack, translationTrack, viewMode, onChangeVideo }: VideoStageProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, toggleFullscreen } = useFullscreen(stageRef)
  const [shortcutFeedback, setShortcutFeedback] = useState<PlaybackShortcutFeedback | null>(null)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isPlaying = player.playerState === YT_PLAYER_STATE.PLAYING

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
    if (isPlaying) {
      player.pause()
      showShortcutFeedback('إيقاف مؤقت', <Pause size={20} aria-hidden="true" />)
    } else {
      player.play()
      showShortcutFeedback('تشغيل', <Play size={20} aria-hidden="true" />)
    }
  }, [isPlaying, player, showShortcutFeedback])

  const handleSpeedUp = useCallback(() => {
    const nextRate = player.playbackRate + 0.5
    player.setPlaybackRate(nextRate)
    showShortcutFeedback(
      formatPlaybackRate(Math.min(nextRate, MAX_PLAYBACK_RATE)),
      <FastForward size={20} aria-hidden="true" />,
    )
  }, [player, showShortcutFeedback])

  const handleSlowDown = useCallback(() => {
    const nextRate = player.playbackRate - 0.5
    player.setPlaybackRate(nextRate)
    showShortcutFeedback(
      formatPlaybackRate(Math.max(nextRate, MIN_PLAYBACK_RATE)),
      <Rewind size={20} aria-hidden="true" />,
    )
  }, [player, showShortcutFeedback])

  const handleToggleFullscreenShortcut = useCallback(() => {
    toggleFullscreen()
    showShortcutFeedback(
      isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة',
      isFullscreen ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />,
    )
  }, [toggleFullscreen, isFullscreen, showShortcutFeedback])

  useKeyboardShortcuts(player.isReady, {
    onTogglePlayPause: handleTogglePlayPause,
    onSpeedUp: handleSpeedUp,
    onSlowDown: handleSlowDown,
    onToggleFullscreen: handleToggleFullscreenShortcut,
  })

  return (
    <div
      ref={stageRef}
      className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-elevated"
    >
      <YouTubePlayerView containerId={player.containerId} isReady={player.isReady} loadError={player.loadError} />

      {player.isReady && (
        <>
          <VideoTopBar languageCode={sourceTrack.languageCode} onBack={onChangeVideo} />

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
            />
          </div>
        </>
      )}
    </div>
  )
}
