import { useState, type ChangeEvent } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react'
import { usePlayerTime } from '@/hooks/usePlayerTime'
import { YT_PLAYER_STATE } from '@/types/youtube.types'
import type { YouTubePlayerState } from '@/types/youtube.types'

interface VideoControlBarProps {
  playerState: YouTubePlayerState
  duration: number
  getCurrentTime: () => number
  onPlay: () => void
  onPause: () => void
  onSeek: (seconds: number) => void
  onToggleMute: () => void
  onSetVolume: (volume: number) => void
  initialAudioState: { isMuted: boolean; volume: number }
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

/** تنسيق الثواني إلى "دقائق:ثواني" بالأرقام اللاتينية دوماً (معيار عالمي لعدادات الوقت) */
function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00'
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * شريط تحكم مخصص بالكامل يحل محل واجهة يوتيوب الافتراضية (controls: 0)
 *
 * ملاحظة أداء: هذا المكوّن يشترك في الوقت الحالي عبر usePlayerTime تماماً
 * كما تفعل لوحة الترجمة والنص المتزامن — فهو أحد المكوّنات القليلة التي
 * يُفترض أن تُعاد رسمها بمعدل عالٍ أثناء التشغيل (لتحريك شريط التقدّم)،
 * وهذا الاشتراك معزول هنا تماماً ولا يؤثر على بقية الشجرة (انظر usePlayerTime)
 */
export function VideoControlBar({
  playerState,
  duration,
  getCurrentTime,
  onPlay,
  onPause,
  onSeek,
  onToggleMute,
  onSetVolume,
  initialAudioState,
  isFullscreen,
  onToggleFullscreen,
}: VideoControlBarProps) {
  const isPlaying = playerState === YT_PLAYER_STATE.PLAYING
  const currentTime = usePlayerTime(getCurrentTime, isPlaying)

  // حالة محلية للصوت: تُهيَّأ مرة واحدة من حالة المشغّل الفعلية عند
  // الجاهزية، ثم تُدار محلياً لأن يوتيوب لا يرسل أحداثاً عند تغيّر الصوت
  const [isMuted, setIsMuted] = useState(initialAudioState.isMuted)
  const [volume, setVolumeState] = useState(initialAudioState.volume)

  function handleSeekChange(event: ChangeEvent<HTMLInputElement>) {
    onSeek(Number(event.target.value))
  }

  function handleVolumeChange(event: ChangeEvent<HTMLInputElement>) {
    const next = Number(event.target.value)
    setVolumeState(next)
    setIsMuted(next === 0)
    onSetVolume(next)
  }

  function handleToggleMute() {
    setIsMuted((previous) => !previous)
    onToggleMute()
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex flex-col gap-1.5 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-3 pb-2.5 pt-6">
      {/* شريط التقدّم — يعرض النسبة الحالية ويسمح بالقفز المباشر عبر السحب */}
      <div className="relative flex h-3 items-center">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-console transition-[width] duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeekChange}
          aria-label="موضع التشغيل الحالي في الفيديو"
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent accent-console opacity-0 hover:opacity-100 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-console"
        />
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-white transition-colors hover:text-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
        >
          {isPlaying ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>

        <span className="font-mono text-xs tabular-nums text-white/80">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="flex flex-1 items-center justify-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
              className="flex h-8 w-8 items-center justify-center rounded-sm text-white transition-colors hover:text-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={17} aria-hidden="true" />
              ) : (
                <Volume2 size={17} aria-hidden="true" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="مستوى الصوت"
              className="h-1 w-14 cursor-pointer appearance-none rounded-full bg-white/25 accent-console sm:w-16"
            />
          </div>

          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
            className="flex h-8 w-8 items-center justify-center rounded-sm text-white transition-colors hover:text-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
          >
            {isFullscreen ? (
              <Minimize size={16} aria-hidden="true" />
            ) : (
              <Maximize size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
