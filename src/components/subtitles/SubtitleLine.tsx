import { useRef, type RefObject } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { useDraggableOverlayPosition } from '@/hooks/useDraggableOverlayPosition'
import { cn } from '@/lib/utils/cn'
import type { LineOffset, SubtitleLine as SubtitleLineId } from '@/lib/subtitles/subtitleLayout'
import { ClickableWords } from './ClickableWords'

/** The reference line is smaller and lighter so the language being learned stays the focus */
const LINE_STYLES: Record<SubtitleLineId, { fontScale: number; className: string }> = {
  source: { fontScale: 0.85, className: 'bg-black/55 px-3 py-0.5 italic' },
  translation: { fontScale: 1, className: 'bg-black/70 px-3.5 py-1.5 font-bold shadow-elevated' },
}

interface SubtitleLineProps {
  line: SubtitleLineId
  text: string
  fontSize: number
  color: string
  lineHeight: number
  maxWidthPercent: number
  offset: LineOffset
  onOffsetChange: (line: SubtitleLineId, offset: LineOffset) => void
  /** Drag bounds: the whole video stage */
  stageRef: RefObject<HTMLDivElement>
  /** When set, each word is a button that reports the clicked word */
  onWordClick?: (word: string) => void
}

/** One language line over the video: draggable on its own, double-click returns it to its default spot */
export function SubtitleLine({
  line,
  text,
  fontSize,
  color,
  lineHeight,
  maxWidthPercent,
  offset,
  onOffsetChange,
  stageRef,
  onWordClick,
}: SubtitleLineProps) {
  const lineRef = useRef<HTMLDivElement>(null)
  const { transformPx, isDragging, onPointerDown, onDoubleClick, wasDragged } = useDraggableOverlayPosition(
    stageRef,
    lineRef,
    offset,
    (next) => onOffsetChange(line, next),
  )
  const style = LINE_STYLES[line]

  return (
    <div
      ref={lineRef}
      data-testid={`subtitle-line-${line}`}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      // Width cap lives here, where the reference width (the stage) is definite; on the <p> it would wrap early
      style={{ transform: `translate(${transformPx.x}px, ${transformPx.y}px)`, maxWidth: `${maxWidthPercent}%` }}
      title="اسحب لتحريك هذا السطر، أو انقر نقراً مزدوجاً لإعادته لموضعه"
      className={cn(
        'pointer-events-auto flex touch-none select-none flex-col items-center rounded-md ring-white/0 ring-offset-2 ring-offset-transparent transition-shadow hover:ring-2 hover:ring-white/25',
        isDragging ? 'cursor-grabbing' : 'cursor-grab',
      )}
    >
      <AnimatePresence mode="wait">
        <m.p
          key={text}
          dir="auto"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn('whitespace-pre-line rounded-md text-center', style.className)}
          style={{ fontSize: `${fontSize * style.fontScale}px`, color, maxWidth: '100%', lineHeight }}
        >
          {onWordClick ? (
            <ClickableWords text={text} onWordClick={(word) => !wasDragged() && onWordClick(word)} />
          ) : (
            text
          )}
        </m.p>
      </AnimatePresence>
    </div>
  )
}
