import { useEffect, useRef } from 'react'

const DEFAULT_SEEK_OFFSET_SECONDS = 10
// The OS scrubber extrapolates from the last report, so seeks made inside the app need a periodic correction
const POSITION_REFRESH_INTERVAL_MS = 5000

export interface MediaSessionControls {
  onPlay: () => void
  onPause: () => void
  onSeekTo: (seconds: number) => void
  onPrevScene: () => void
  onNextScene: () => void
}

interface UseMediaSessionOptions {
  /** Register only once the player is ready, so the OS controls never drive a dead player */
  enabled: boolean
  title: string | null
  isPlaying: boolean
  duration: number
  playbackRate: number
  getCurrentTime: () => number
  controls: MediaSessionControls
}

function getMediaSession(): MediaSession | null {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator ? navigator.mediaSession : null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Lock-screen, headset and keyboard media keys for the current video.
 * Previous/next track jump between subtitle segments instead of playlist items,
 * which is what a language learner reaches for.
 */
export function useMediaSession(options: UseMediaSessionOptions): void {
  const { enabled, title, isPlaying, duration, playbackRate } = options

  const latestRef = useRef(options)
  latestRef.current = options

  useEffect(() => {
    const session = getMediaSession()
    if (!enabled || !session) return

    function seekBy(direction: 1 | -1, details: MediaSessionActionDetails) {
      const { getCurrentTime, duration: total, controls } = latestRef.current
      const offset = details.seekOffset ?? DEFAULT_SEEK_OFFSET_SECONDS
      controls.onSeekTo(clamp(getCurrentTime() + direction * offset, 0, total))
    }

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => latestRef.current.controls.onPlay()],
      ['pause', () => latestRef.current.controls.onPause()],
      ['seekbackward', (details) => seekBy(-1, details)],
      ['seekforward', (details) => seekBy(1, details)],
      [
        'seekto',
        ({ seekTime }) => {
          if (typeof seekTime === 'number' && Number.isFinite(seekTime)) latestRef.current.controls.onSeekTo(seekTime)
        },
      ],
      ['previoustrack', () => latestRef.current.controls.onPrevScene()],
      ['nexttrack', () => latestRef.current.controls.onNextScene()],
    ]

    // Older browsers throw on actions they do not know; skip those instead of failing the player
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler)
      } catch {
        continue
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null)
        } catch {
          continue
        }
      }
      session.metadata = null
      session.playbackState = 'none'
    }
  }, [enabled])

  useEffect(() => {
    const session = getMediaSession()
    if (!enabled || !session) return
    session.metadata = typeof MediaMetadata === 'undefined' ? null : new MediaMetadata({ title: title ?? document.title })
  }, [enabled, title])

  useEffect(() => {
    const session = getMediaSession()
    if (!enabled || !session) return
    session.playbackState = isPlaying ? 'playing' : 'paused'
  }, [enabled, isPlaying])

  useEffect(() => {
    const session = getMediaSession()
    if (!enabled || !session || !Number.isFinite(duration) || duration <= 0 || playbackRate <= 0) return

    function reportPosition() {
      try {
        session?.setPositionState({
          duration,
          playbackRate,
          position: clamp(latestRef.current.getCurrentTime(), 0, duration),
        })
      } catch {
        // Some browsers reject a position they consider out of range; the next report corrects it
      }
    }

    reportPosition()
    if (!isPlaying) return
    const timer = setInterval(reportPosition, POSITION_REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [enabled, isPlaying, duration, playbackRate])
}
