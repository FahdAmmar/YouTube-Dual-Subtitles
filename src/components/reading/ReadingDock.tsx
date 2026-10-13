import { useState, type CSSProperties } from 'react'
import { Pause, Play, Minus, Plus, SkipBack, SkipForward, RotateCcw, RotateCw, SlidersHorizontal } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { usePlayerTime } from '@/hooks/usePlayerTime'
import { MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE } from '@/hooks/useYouTubePlayer'
import { DOUBLE_TAP_SEEK_SECONDS } from '@/lib/utils/touchGestures'
import { formatClock } from '@/lib/utils/formatClock'
import { formatPlaybackRate } from '@/lib/utils/formatPlaybackRate'
import { YT_PLAYER_STATE } from '@/types/youtube.types'
import type { UseVideoPlayerResult } from '@/hooks/useVideoPlayer'
import type { PairedSlice } from '@/lib/subtitles/pairCues'

const SPEED_STEP = 0.25
const SEEK_STEP_SECONDS = 0.5

interface ReadingDockProps {
  player: UseVideoPlayerResult
  slices: PairedSlice[]
  currentIndex: number
  onSeekToSlice: (slice: PairedSlice) => void
  isToolsOpen: boolean
  onToggleTools: () => void
}

function SkipIcon({ direction }: { direction: 'back' | 'forward' }) {
  const Arrow = direction === 'back' ? RotateCcw : RotateCw
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center">
      <Arrow size={28} strokeWidth={1.6} aria-hidden="true" />
      <span aria-hidden="true" className="absolute text-[9px] font-bold leading-none">
        {DOUBLE_TAP_SEEK_SECONDS}
      </span>
    </span>
  )
}

/** Slim progress bar and transport controls, laid out like the rest of the RTL interface */
export function ReadingDock({ player, slices, currentIndex, onSeekToSlice, isToolsOpen, onToggleTools }: ReadingDockProps) {
  const isPlaying = player.playerState === YT_PLAYER_STATE.PLAYING
  const time = usePlayerTime(player.getCurrentTime, isPlaying)
  const [draggedTime, setDraggedTime] = useState<number | null>(null)

  const duration = Math.max(player.duration, 0)
  const shownTime = duration > 0 ? Math.min(draggedTime ?? time, duration) : (draggedTime ?? time)
  const progressPercent = duration > 0 ? (shownTime / duration) * 100 : 0
  const isRtl = document.documentElement.dir === 'rtl'

  function commitSeek() {
    if (draggedTime === null) return
    player.seekTo(draggedTime)
    setDraggedTime(null)
  }

  function skip(seconds: number) {
    const upperBound = duration > 0 ? duration : Number.POSITIVE_INFINITY
    player.seekTo(Math.min(upperBound, Math.max(0, player.getCurrentTime() + seconds)))
  }

  function goToLine(index: number) {
    const target = slices[Math.min(Math.max(index, 0), slices.length - 1)]
    if (target) onSeekToSlice(target)
  }

  function changeSpeed(delta: number) {
    const next = Math.round((player.playbackRate + delta) * 100) / 100
    player.setPlaybackRate(Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, next)))
  }

  const hasLines = slices.length > 0
  const rangeStyle = {
    '--progress': `${progressPercent}%`,
    '--fill-direction': isRtl ? 'to left' : 'to right',
  } as CSSProperties

  return (
    <div className="border-t border-border/60 bg-bg/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <span className="w-12 text-center font-mono text-[11px] tabular-nums text-text-secondary" dir="ltr">
            {formatClock(shownTime)}
          </span>
          <input
            type="range"
            aria-label="موضع التشغيل"
            min={0}
            max={duration || 0}
            step={SEEK_STEP_SECONDS}
            value={shownTime}
            disabled={!player.isReady || duration === 0}
            onChange={(event) => setDraggedTime(Number(event.target.value))}
            onPointerUp={commitSeek}
            onKeyUp={commitSeek}
            onBlur={commitSeek}
            style={rangeStyle}
            className="reading-range flex-1"
          />
          <span className="w-12 text-center font-mono text-[11px] tabular-nums text-text-secondary" dir="ltr">
            {formatClock(duration)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center gap-1">
            <IconButton
              aria-label="أدوات القراءة"
              aria-expanded={isToolsOpen}
              onClick={onToggleTools}
              className="h-9 w-9 lg:hidden"
            >
              <SlidersHorizontal size={17} aria-hidden="true" />
            </IconButton>
            <p className="hidden font-mono text-xs tabular-nums text-text-secondary sm:block" dir="ltr">
              {hasLines ? `${Math.max(currentIndex, 0) + 1} / ${slices.length}` : '—'}
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <IconButton
              aria-label="المقطع السابق"
              onClick={() => goToLine(currentIndex - 1)}
              disabled={!hasLines}
              className="hidden h-10 w-10 sm:inline-flex"
            >
              <SkipForward size={18} aria-hidden="true" />
            </IconButton>
            <IconButton aria-label={`رجوع ${DOUBLE_TAP_SEEK_SECONDS} ثوانٍ`} onClick={() => skip(-DOUBLE_TAP_SEEK_SECONDS)} className="h-11 w-11">
              <SkipIcon direction="back" />
            </IconButton>
            <button
              type="button"
              aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              onClick={isPlaying ? player.pause : player.play}
              disabled={!player.isReady}
              className="flex h-12 w-12 items-center justify-center rounded-full text-text-primary transition-[background-color,transform] hover:bg-surface-elevated active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console disabled:opacity-45"
            >
              {isPlaying ? (
                <Pause size={28} className="fill-current" aria-hidden="true" />
              ) : (
                <Play size={28} className="fill-current" aria-hidden="true" />
              )}
            </button>
            <IconButton aria-label={`تقديم ${DOUBLE_TAP_SEEK_SECONDS} ثوانٍ`} onClick={() => skip(DOUBLE_TAP_SEEK_SECONDS)} className="h-11 w-11">
              <SkipIcon direction="forward" />
            </IconButton>
            <IconButton
              aria-label="المقطع التالي"
              onClick={() => goToLine(currentIndex + 1)}
              disabled={!hasLines}
              className="hidden h-10 w-10 sm:inline-flex"
            >
              <SkipBack size={18} aria-hidden="true" />
            </IconButton>
          </div>

          <div className="flex items-center justify-end gap-0.5" role="group" aria-label="سرعة التشغيل">
            <IconButton
              aria-label="إبطاء التشغيل"
              onClick={() => changeSpeed(-SPEED_STEP)}
              disabled={player.playbackRate <= MIN_PLAYBACK_RATE}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <Minus size={14} aria-hidden="true" />
            </IconButton>
            <button
              type="button"
              aria-label="إعادة السرعة إلى 1×"
              onClick={() => player.setPlaybackRate(1)}
              className="min-w-[2.75rem] rounded-md px-1 py-1.5 font-mono text-sm tabular-nums text-text-primary transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
              dir="ltr"
            >
              {formatPlaybackRate(player.playbackRate)}
            </button>
            <IconButton
              aria-label="تسريع التشغيل"
              onClick={() => changeSpeed(SPEED_STEP)}
              disabled={player.playbackRate >= MAX_PLAYBACK_RATE}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <Plus size={14} aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  )
}
