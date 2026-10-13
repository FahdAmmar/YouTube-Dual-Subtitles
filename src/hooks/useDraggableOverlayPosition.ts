import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { ZERO_OFFSET, type LineOffset } from '@/lib/subtitles/subtitleLayout'

/** Pointer travel (px) under which a press is a click, not a drag — lets words inside a line stay clickable */
const DRAG_THRESHOLD_PX = 4

interface DragState {
  startClientX: number
  startClientY: number
  startTranslateXPx: number
  startTranslateYPx: number
  minDeltaX: number
  maxDeltaX: number
  minDeltaY: number
  maxDeltaY: number
  containerWidth: number
  containerHeight: number
}

export interface UseDraggableOverlayPositionResult {
  transformPx: { x: number; y: number }
  isDragging: boolean
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  /** Resets the element to its default spot */
  onDoubleClick: () => void
  /** True when the last press moved far enough to be a drag; a click handler uses it to ignore drag-ends */
  wasDragged: () => boolean
}

/**
 * Drag mechanics for one overlay element, kept inside the video bounds.
 * Controlled: the saved `offset` comes from the caller and `onCommit` fires once when a drag ends,
 * so persistence stays in one place (useSubtitleLayout).
 */
export function useDraggableOverlayPosition(
  containerRef: RefObject<HTMLDivElement>,
  overlayRef: RefObject<HTMLDivElement>,
  offset: LineOffset,
  onCommit: (offset: LineOffset) => void,
): UseDraggableOverlayPositionResult {
  const [dragOffset, setDragOffset] = useState<LineOffset | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const dragStateRef = useRef<DragState | null>(null)
  const didDragRef = useRef(false)
  const latestDragOffsetRef = useRef<LineOffset | null>(null)
  const activeOffset = dragOffset ?? offset
  const activeOffsetRef = useRef(activeOffset)
  activeOffsetRef.current = activeOffset
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit

  // ResizeObserver instead of measuring on every render: avoids layout thrashing during playback
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function updateSize() {
      const rect = container!.getBoundingClientRect()
      setContainerSize((prev) =>
        prev.width === rect.width && prev.height === rect.height ? prev : { width: rect.width, height: rect.height },
      )
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef])

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return
      const container = containerRef.current
      const overlay = overlayRef.current
      if (!container || !overlay) return

      const containerRect = container.getBoundingClientRect()
      const overlayRect = overlay.getBoundingClientRect()
      const current = activeOffsetRef.current

      didDragRef.current = false
      latestDragOffsetRef.current = null
      dragStateRef.current = {
        startClientX: event.clientX,
        startClientY: event.clientY,
        startTranslateXPx: (current.xPercent / 100) * containerRect.width,
        startTranslateYPx: (current.yPercent / 100) * containerRect.height,
        // Allowed extra travel so no edge of the element leaves the video, measured from where it sits now
        minDeltaX: containerRect.left - overlayRect.left,
        maxDeltaX: containerRect.right - overlayRect.right,
        minDeltaY: containerRect.top - overlayRect.top,
        maxDeltaY: containerRect.bottom - overlayRect.bottom,
        containerWidth: containerRect.width,
        containerHeight: containerRect.height,
      }
      setIsDragging(true)
    },
    [containerRef, overlayRef],
  )

  const onDoubleClick = useCallback(() => onCommitRef.current(ZERO_OFFSET), [])
  const wasDragged = useCallback(() => didDragRef.current, [])

  useEffect(() => {
    if (!isDragging) return

    function handlePointerMove(event: PointerEvent) {
      const dragState = dragStateRef.current
      if (!dragState) return

      const rawDeltaX = event.clientX - dragState.startClientX
      const rawDeltaY = event.clientY - dragState.startClientY
      if (!didDragRef.current) {
        if (Math.hypot(rawDeltaX, rawDeltaY) < DRAG_THRESHOLD_PX) return
        didDragRef.current = true
      }

      const clampedDeltaX = Math.min(Math.max(rawDeltaX, dragState.minDeltaX), dragState.maxDeltaX)
      const clampedDeltaY = Math.min(Math.max(rawDeltaY, dragState.minDeltaY), dragState.maxDeltaY)
      const next: LineOffset = {
        xPercent: ((dragState.startTranslateXPx + clampedDeltaX) / dragState.containerWidth) * 100,
        yPercent: ((dragState.startTranslateYPx + clampedDeltaY) / dragState.containerHeight) * 100,
      }
      latestDragOffsetRef.current = next
      setDragOffset(next)
    }

    function endDrag() {
      const committed = latestDragOffsetRef.current
      dragStateRef.current = null
      setIsDragging(false)
      setDragOffset(null)
      if (committed) onCommitRef.current(committed)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
  }, [isDragging])

  const transformPx = useMemo(
    () => ({
      x: (activeOffset.xPercent / 100) * containerSize.width,
      y: (activeOffset.yPercent / 100) * containerSize.height,
    }),
    [activeOffset.xPercent, activeOffset.yPercent, containerSize.width, containerSize.height],
  )

  return { transformPx, isDragging, onPointerDown, onDoubleClick, wasDragged }
}
