import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Gauge } from 'lucide-react'
import { usePlayerTime } from '@/hooks/usePlayerTime'
import { cn } from '@/lib/utils/cn'
import { formatPlaybackRate } from '@/lib/utils/formatPlaybackRate'
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
  playbackRate: number
  onSetPlaybackRate: (rate: number) => void
  qualityLevels: string[]
  currentQuality: string
  onSetQuality: (quality: string) => void
}

/** خيارات سرعة التشغيل القياسية المعروضة في القائمة — تطابق المجموعة الشائعة في يوتيوب نفسه */
const PLAYBACK_RATE_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

/** تحويل رمز جودة يوتيوب إلى نص مقروء */
function formatQuality(quality: string): string {
  const map: Record<string, string> = {
    highres: '4K+',
    hd2160: '4K',
    hd1080: '1080p',
    hd720: '720p',
    large: '480p',
    medium: '360p',
    small: '240p',
    tiny: '144p',
    auto: 'تلقائي',
  }
  return map[quality] ?? quality
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
 *
 * زر السرعة هنا هو المكافئ المرئي/القابل للنقر لاختصارَي لوحة المفاتيح
 * c/x (انظر useKeyboardShortcuts في VideoStage) — إتاحة نفس القدرة
 * لمستخدمي الفأرة/اللمس بدل حصرها في اختصار غير مكتشَف بصرياً
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
  playbackRate,
  onSetPlaybackRate,
  qualityLevels,
  currentQuality,
  onSetQuality,
}: VideoControlBarProps) {
  const isPlaying = playerState === YT_PLAYER_STATE.PLAYING
  const currentTime = usePlayerTime(getCurrentTime, isPlaying)

  // حالة محلية للصوت: تُهيَّأ مرة واحدة من حالة المشغّل الفعلية عند
  // الجاهزية، ثم تُدار محلياً لأن يوتيوب لا يرسل أحداثاً عند تغيّر الصوت
  const [isMuted, setIsMuted] = useState(initialAudioState.isMuted)
  const [volume, setVolumeState] = useState(initialAudioState.volume)
  const [isRateMenuOpen, setIsRateMenuOpen] = useState(false)
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false)
  const rateMenuRef = useRef<HTMLDivElement>(null)
  const qualityMenuRef = useRef<HTMLDivElement>(null)

  // إغلاق قائمة السرعة عند النقر خارجها — نمط قياسي لأي قائمة منبثقة
  useEffect(() => {
    if (!isRateMenuOpen) return
    function handlePointerDownOutside(event: PointerEvent) {
      if (rateMenuRef.current && !rateMenuRef.current.contains(event.target as Node)) {
        setIsRateMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDownOutside)
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside)
  }, [isRateMenuOpen])

  // إغلاق قائمة الجودة عند النقر خارجها
  useEffect(() => {
    if (!isQualityMenuOpen) return
    function handlePointerDownOutside(event: PointerEvent) {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(event.target as Node)) {
        setIsQualityMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDownOutside)
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside)
  }, [isQualityMenuOpen])

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

  function handleSelectRate(rate: number) {
    onSetPlaybackRate(rate)
    setIsRateMenuOpen(false)
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
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent accent-console opacity-70 transition-opacity hover:opacity-100 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-console"
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
            {/* منزلق الصوت مخفي على الجوال: بين زر الكتم وزر السرعة وزر ملء
                الشاشة معاً، لم تعد المساحة تتّسع لمنزلق إضافي على الشاشات
                الضيقة دون ازدحام أو فيضان الصف بأكمله. زر الكتم وحده يبقى
                كافياً على الجوال (يطابق تعارف تطبيقات الفيديو الأخرى هناك) */}
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="مستوى الصوت"
              className="hidden h-1 w-14 cursor-pointer appearance-none rounded-full bg-white/25 accent-console sm:block sm:w-16"
            />
          </div>

          <div ref={rateMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsRateMenuOpen((previous) => !previous)}
              aria-label={`سرعة التشغيل الحالية ${formatPlaybackRate(playbackRate)}، اضغط لتغييرها`}
              aria-expanded={isRateMenuOpen}
              aria-haspopup="menu"
              className={cn(
                'flex h-8 min-w-8 items-center justify-center gap-1 rounded-sm px-1.5 font-mono text-[11px] tabular-nums text-white transition-colors hover:text-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console',
                playbackRate !== 1 && 'text-console',
              )}
            >
              <Gauge size={15} aria-hidden="true" />
              {formatPlaybackRate(playbackRate)}
            </button>

            {isRateMenuOpen && (
              <div
                role="menu"
                aria-label="اختيار سرعة التشغيل"
                className="absolute bottom-full end-0 z-10 mb-2 flex flex-col gap-0.5 rounded-md border border-white/10 bg-black/90 p-1 shadow-elevated backdrop-blur-sm"
              >
                {PLAYBACK_RATE_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    role="menuitemradio"
                    aria-checked={rate === playbackRate}
                    onClick={() => handleSelectRate(rate)}
                    className={cn(
                      'rounded-sm px-3 py-1 text-start font-mono text-xs tabular-nums text-white/85 transition-colors hover:bg-white/10',
                      rate === playbackRate && 'text-console',
                    )}
                  >
                    {formatPlaybackRate(rate)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {qualityLevels.length > 0 && (
            <div ref={qualityMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsQualityMenuOpen((previous) => !previous)}
                aria-label={`جودة الفيديو ${formatQuality(currentQuality)}، اضغط لتغييرها`}
                aria-expanded={isQualityMenuOpen}
                aria-haspopup="menu"
                className={cn(
                  'flex h-8 min-w-8 items-center justify-center gap-1 rounded-sm px-1.5 font-mono text-[11px] tabular-nums text-white transition-colors hover:text-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console',
                )}
              >
                HD
              </button>

              {isQualityMenuOpen && (
                <div
                  role="menu"
                  aria-label="اختيار جودة الفيديو"
                  className="absolute bottom-full end-0 z-10 mb-2 flex max-h-60 flex-col gap-0.5 overflow-y-auto rounded-md border border-white/10 bg-black/90 p-1 shadow-elevated backdrop-blur-sm"
                >
                  {qualityLevels.map((level) => (
                    <button
                      key={level}
                      type="button"
                      role="menuitemradio"
                      aria-checked={level === currentQuality}
                      onClick={() => {
                        onSetQuality(level)
                        setIsQualityMenuOpen(false)
                      }}
                      className={cn(
                        'rounded-sm px-3 py-1 text-start font-mono text-xs tabular-nums text-white/85 transition-colors hover:bg-white/10',
                        level === currentQuality && 'text-console',
                      )}
                    >
                      {formatQuality(level)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
