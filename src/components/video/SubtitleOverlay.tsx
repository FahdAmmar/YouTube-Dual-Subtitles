import { type RefObject } from 'react'
import { useClockSelector } from '@/hooks/usePlayerTime'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useSubtitleSettings } from '@/context/SubtitleSettingsContext'
import { cn } from '@/lib/utils/cn'
import { findActiveCue } from '@/lib/subtitles/findActiveCue'
import { getVisibleTracks } from '@/lib/subtitles/visibleTracks'
import { SubtitleLine } from '@/components/subtitles/SubtitleLine'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import {
  getSubtitleFontScale,
  type LineOffset,
  type SubtitleLayout,
  type SubtitleLine as SubtitleLineId,
  type SubtitlePlacement,
} from '@/lib/subtitles/subtitleLayout'
import type { SubtitleTrackState, WordSelection } from '@/types/subtitle.types'
import type { ViewMode } from '@/types/theme.types'

/** Default spot of the subtitle block per region. `bottom-18` clears the control bar; `top-16` clears the top bar. */
const PLACEMENT_CLASSES: Record<SubtitlePlacement, string> = {
  bottom: 'bottom-18',
  middle: 'top-1/2 -translate-y-1/2',
  top: 'top-16',
}

interface SubtitleOverlayProps {
  sourceTrack: SubtitleTrackState
  translationTrack: SubtitleTrackState
  getCurrentTime: () => number
  viewMode: ViewMode
  /** Recall mode: paired segments and the revealed one, to know if the playing segment is revealed */
  slices: PairedSlice[]
  revealedIndex: number | null
  onToggleReveal: () => void
  /** The whole video stage — drag bounds */
  stageRef: RefObject<HTMLDivElement>
  layout: SubtitleLayout
  onLineOffsetChange: (line: SubtitleLineId, offset: LineOffset) => void
  /** A word of the translation line was clicked */
  onWordSelect: (selection: WordSelection) => void
}

/**
 * Burned-in dual subtitles. The translation (the language being learned) is large and bold; the source is a
 * smaller reference line. Each line drags independently inside the video and the whole block can jump between
 * top / middle / bottom (SubtitleQuickControls). The empty area stays pointer-events-none so the video and the
 * control bar below stay clickable. It subscribes to the shared clock with selectors, so it renders when a cue changes
 * and not on every tick (see useClockSelector).
 */
export function SubtitleOverlay({
  sourceTrack,
  translationTrack,
  getCurrentTime,
  viewMode,
  slices,
  revealedIndex,
  onToggleReveal,
  stageRef,
  layout,
  onLineOffsetChange,
  onWordSelect,
}: SubtitleOverlayProps) {
  const { settings } = useSubtitleSettings()
  // The chosen sizes are pixels; scaling them with the stage keeps a long line from filling a phone-sized video
  const fontScale = getSubtitleFontScale(useElementWidth(stageRef))

  // Each selector returns an existing cue (or a number), so this re-renders only when a cue starts or ends,
  // not on every clock tick
  const activeSource = useClockSelector(getCurrentTime, (time) =>
    findActiveCue(sourceTrack.cues, time - sourceTrack.syncOffsetSeconds),
  )
  const activeTranslation = useClockSelector(getCurrentTime, (time) =>
    findActiveCue(translationTrack.cues, time - translationTrack.syncOffsetSeconds),
  )
  const activeSliceIndex = useClockSelector(getCurrentTime, (time) => findActiveCue(slices, time)?.originalIndex ?? -1)

  const isRevealed = revealedIndex !== null && activeSliceIndex === revealedIndex
  const visibleTracks = getVisibleTracks(viewMode, isRevealed)
  const showSource = visibleTracks.source && activeSource
  const showTranslation = visibleTracks.translation && activeTranslation
  const showRevealPrompt = viewMode === 'recall' && !isRevealed && Boolean(activeTranslation)

  if (!showSource && !showTranslation && !showRevealPrompt) return null

  const commonLineProps = {
    maxWidthPercent: settings.subtitleWidthPercent,
    lineHeight: settings.subtitleLineHeight,
    showBackdrop: settings.showBackdrop,
    stageRef,
    onOffsetChange: onLineOffsetChange,
  }

  return (
    <div className={cn('pointer-events-none absolute inset-x-0 flex flex-col items-center gap-1.5 px-4', PLACEMENT_CLASSES[layout.placement])}>
      {showSource && (
        <SubtitleLine
          line="source"
          text={activeSource.text}
          fontSize={settings.trackA.fontSize * fontScale}
          color={settings.trackA.color}
          offset={layout.source}
          {...commonLineProps}
        />
      )}

      {showTranslation && (
        <SubtitleLine
          line="translation"
          text={activeTranslation.text}
          fontSize={settings.trackB.fontSize * fontScale}
          color={settings.trackB.color}
          offset={layout.translation}
          onWordClick={(word) =>
            onWordSelect({
              word,
              sentence: activeTranslation.text,
              time: activeTranslation.start + translationTrack.syncOffsetSeconds,
            })
          }
          {...commonLineProps}
        />
      )}

      {showRevealPrompt && (
        <button
          type="button"
          onClick={onToggleReveal}
          className="pointer-events-auto rounded-md bg-black/70 px-3 py-1.5 text-sm font-medium text-white/85 transition-colors hover:bg-black/85 hover:text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console"
        >
          اكشف الترجمة (R)
        </button>
      )}
    </div>
  )
}
