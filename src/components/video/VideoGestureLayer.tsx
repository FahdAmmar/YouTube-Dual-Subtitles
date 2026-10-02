import { useCallback, useEffect, useRef, type PointerEvent } from 'react'
import { DOUBLE_TAP_WINDOW_MS, classifyRelease, getTapZone, type PointerSample, type TapZone } from '@/lib/utils/touchGestures'

interface VideoGestureLayerProps {
  onTogglePlay: () => void
  onSeekBackward: () => void
  onSeekForward: () => void
  onPrevScene: () => void
  onNextScene: () => void
}

interface PendingTap {
  zone: TapZone
  timer: ReturnType<typeof setTimeout>
}

/**
 * Touch gestures over the video: tap toggles playback, double tap on the left/right
 * third skips back/forward (more taps keep skipping), and a horizontal swipe jumps
 * to the previous/next subtitle segment.
 *
 * Inert unless the primary pointer is coarse (a phone or tablet), so on desktop the
 * player keeps receiving clicks exactly as before. It sits below the top bar, control
 * bar and draggable subtitles, which stay tappable.
 */
export function VideoGestureLayer(props: VideoGestureLayerProps) {
  const latestRef = useRef(props)
  latestRef.current = props

  const startRef = useRef<PointerSample | null>(null)
  const pendingTapRef = useRef<PendingTap | null>(null)
  const seekChain = useRef<{ zone: TapZone; time: number } | null>(null)

  useEffect(
    () => () => {
      if (pendingTapRef.current) clearTimeout(pendingTapRef.current.timer)
    },
    [],
  )

  const seekFor = useCallback((zone: TapZone) => {
    if (zone === 'left') latestRef.current.onSeekBackward()
    else if (zone === 'right') latestRef.current.onSeekForward()
    else return
    seekChain.current = { zone, time: Date.now() }
  }, [])

  const flushPendingTap = useCallback(() => {
    const pending = pendingTapRef.current
    if (!pending) return
    clearTimeout(pending.timer)
    pendingTapRef.current = null
    latestRef.current.onTogglePlay()
  }, [])

  const handleTap = useCallback(
    (zone: TapZone) => {
      const now = Date.now()
      const chain = seekChain.current
      if (chain && chain.zone === zone && now - chain.time < DOUBLE_TAP_WINDOW_MS) {
        seekFor(zone)
        return
      }

      const pending = pendingTapRef.current
      if (pending && pending.zone === zone) {
        clearTimeout(pending.timer)
        pendingTapRef.current = null
        seekFor(zone)
        return
      }

      // A tap elsewhere means the earlier one was a plain tap after all
      flushPendingTap()
      const timer = setTimeout(() => {
        pendingTapRef.current = null
        latestRef.current.onTogglePlay()
      }, DOUBLE_TAP_WINDOW_MS)
      pendingTapRef.current = { zone, timer }
    },
    [flushPendingTap, seekFor],
  )

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' || !event.isPrimary) return
    startRef.current = { x: event.clientX, y: event.clientY, time: Date.now() }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = startRef.current
    startRef.current = null
    if (!start || event.pointerType === 'mouse' || !event.isPrimary) return

    const end: PointerSample = { x: event.clientX, y: event.clientY, time: Date.now() }
    const kind = classifyRelease(start, end)

    if (kind === 'swipe-left') latestRef.current.onNextScene()
    else if (kind === 'swipe-right') latestRef.current.onPrevScene()
    else if (kind === 'tap') {
      const rect = event.currentTarget.getBoundingClientRect()
      handleTap(getTapZone(event.clientX - rect.left, rect.width))
    }
  }

  return (
    <div
      data-testid="video-gesture-layer"
      aria-hidden="true"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        startRef.current = null
      }}
      className="pointer-events-none absolute inset-0 touch-pan-y [@media(pointer:coarse)]:pointer-events-auto"
    />
  )
}
