import { type RefObject } from 'react'
import { usePlayerTime } from '@/hooks/usePlayerTime'
import { useActiveCue } from '@/hooks/useActiveCue'
import { useSubtitleSettings } from '@/context/SubtitleSettingsContext'
import { cn } from '@/lib/utils/cn'
import { findActiveCue } from '@/lib/subtitles/findActiveCue'
import { getVisibleTracks } from '@/lib/subtitles/visibleTracks'
import { SubtitleLine } from '@/components/subtitles/SubtitleLine'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { LineOffset, SubtitleLayout, SubtitleLine as SubtitleLineId, SubtitlePlacement } from '@/lib/subtitles/subtitleLayout'
import type { SubtitleTrackState, WordSelection } from '@/types/subtitle.types'
import type { ViewMode } from '@/types/theme.types'

/** Default spot of the subtitle block per region. `bottom-[4.5rem]` clears the control bar; `top-16` clears the top bar. */
const PLACEMENT_CLASSES: Record<SubtitlePlacement, string> = {
  bottom: 'bottom-[4.5rem]',
  middle: 'top-1/2 -translate-y-1/2',
  top: 'top-16',
}

interface SubtitleOverlayProps {
  sourceTrack: SubtitleTrackState
  translationTrack: SubtitleTrackState
  getCurrentTime: () => number
  isPlaying: boolean
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
 * control bar below stay clickable. Shares high-frequency time updates with VideoControlBar only (usePlayerTime).
 */
export function SubtitleOverlay({
  sourceTrack,
  translationTrack,
  getCurrentTime,
  isPlaying,
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
  const currentTime = usePlayerTime(getCurrentTime, isPlaying)

  const activeSource = useActiveCue(sourceTrack.cues, currentTime - sourceTrack.syncOffsetSeconds)
  const activeTranslation = useActiveCue(translationTrack.cues, currentTime - translationTrack.syncOffsetSeconds)

  const isRevealed = revealedIndex !== null && findActiveCue(slices, currentTime)?.originalIndex === revealedIndex
  const visibleTracks = getVisibleTracks(viewMode, isRevealed)
  const showSource = visibleTracks.source && activeSource
  const showTranslation = visibleTracks.translation && activeTranslation
  const showRevealPrompt = viewMode === 'recall' && !isRevealed && Boolean(activeTranslation)

  if (!showSource && !showTranslation && !showRevealPrompt) return null

  const commonLineProps = {
    maxWidthPercent: settings.subtitleWidthPercent,
    lineHeight: settings.subtitleLineHeight,
    stageRef,
    onOffsetChange: onLineOffsetChange,
  }

  return (
    <div className={cn('pointer-events-none absolute inset-x-0 flex flex-col items-center gap-1.5 px-4', PLACEMENT_CLASSES[layout.placement])}>
      {showSource && (
        <SubtitleLine
          line="source"
          text={activeSource.text}
          fontSize={settings.trackA.fontSize}
          color={settings.trackA.color}
          offset={layout.source}
          {...commonLineProps}
        />
      )}

      {showTranslation && (
        <SubtitleLine
          line="translation"
          text={activeTranslation.text}
          fontSize={settings.trackB.fontSize}
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
          className="pointer-events-auto rounded-md bg-black/70 px-3 py-1.5 text-sm font-medium text-white/85 transition-colors hover:bg-black/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
        >
          اكشف الترجمة (R)
        </button>
      )}
    </div>
  )
}
