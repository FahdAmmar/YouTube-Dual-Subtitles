import { useRef } from 'react'
import { YouTubePlayerView } from './YouTubePlayerView'
import { VideoTopBar } from './VideoTopBar'
import { VideoControlBar } from './VideoControlBar'
import { SubtitleOverlay } from './SubtitleOverlay'
import { useFullscreen } from '@/hooks/useFullscreen'
import type { UseYouTubePlayerResult } from '@/hooks/useYouTubePlayer'
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

/**
 * "مسرح" الفيديو الكامل — يجمع في حاوية واحدة قابلة لملء الشاشة:
 * المشغّل نفسه، الشريط العلوي (عودة + شارة اللغة)، الترجمة المزدوجة
 * المُطبَّقة فوق الفيديو، وشريط التحكم المخصص أسفله. تجميع كل هذه الطبقات
 * ضمن عنصر واحد (بدل توزيعها في الشجرة) ضروري لأن Fullscreen API يعمل
 * على عنصر DOM واحد — يجب أن يشمل ملء الشاشة كل هذه الطبقات معاً
 */
export function VideoStage({ player, sourceTrack, translationTrack, viewMode, onChangeVideo }: VideoStageProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, toggleFullscreen } = useFullscreen(stageRef)

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
            isPlaying={player.playerState === YT_PLAYER_STATE.PLAYING}
            viewMode={viewMode}
          />

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
            />
          </div>
        </>
      )}
    </div>
  )
}
