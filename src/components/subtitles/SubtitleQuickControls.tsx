import { AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignVerticalJustifyStart, Languages } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { nextPlacement, type SubtitlePlacement } from '@/lib/subtitles/subtitleLayout'
import type { SubtitleTrackState } from '@/types/subtitle.types'
import type { ViewMode } from '@/types/theme.types'

const PLACEMENT_LABELS: Record<SubtitlePlacement, string> = {
  bottom: 'أسفل الفيديو',
  middle: 'منتصف الفيديو',
  top: 'أعلى الفيديو',
}

const PLACEMENT_ICONS: Record<SubtitlePlacement, typeof AlignVerticalJustifyEnd> = {
  bottom: AlignVerticalJustifyEnd,
  middle: AlignVerticalJustifyCenter,
  top: AlignVerticalJustifyStart,
}

const BUTTON_CLASSES =
  'flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-sm px-2 text-white transition-[color,transform] duration-150 hover:text-console active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console'

/** Short badge text and a spoken description of what the language button currently shows */
function describeViewMode(viewMode: ViewMode, source: SubtitleTrackState, translation: SubtitleTrackState) {
  const sourceCode = source.languageCode.toUpperCase()
  const translationCode = translation.languageCode.toUpperCase()
  switch (viewMode) {
    case 'source':
      return { badge: sourceCode, spoken: `${source.languageLabel} فقط` }
    case 'translation':
      return { badge: translationCode, spoken: `${translation.languageLabel} فقط` }
    case 'recall':
      return { badge: 'RECALL', spoken: 'وضع الاستدعاء' }
    case 'both':
      return { badge: `${sourceCode}+${translationCode}`, spoken: `${source.languageLabel} و${translation.languageLabel}` }
  }
}

interface SubtitleQuickControlsProps {
  viewMode: ViewMode
  onCycleViewMode: () => void
  sourceTrack: SubtitleTrackState
  translationTrack: SubtitleTrackState
  placement: SubtitlePlacement
  onCyclePlacement: () => void
}

/**
 * Two one-tap buttons on the video: which language(s) to show, and which region the subtitles sit in.
 * Cycling buttons (not menus) keep them reachable by touch and keyboard, and the placement button doubles as
 * the non-drag alternative for moving subtitles.
 */
export function SubtitleQuickControls({
  viewMode,
  onCycleViewMode,
  sourceTrack,
  translationTrack,
  placement,
  onCyclePlacement,
}: SubtitleQuickControlsProps) {
  const { badge, spoken } = describeViewMode(viewMode, sourceTrack, translationTrack)
  const PlacementIcon = PLACEMENT_ICONS[placement]

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onCycleViewMode}
        aria-label={`اللغة المعروضة: ${spoken}. انقر للتبديل`}
        title="تبديل اللغة المعروضة: الاثنتان ← الإنجليزية فقط ← العربية فقط"
        className={cn(BUTTON_CLASSES, viewMode !== 'both' && 'text-console')}
      >
        <Languages size={15} aria-hidden="true" />
        <span className="font-mono text-[11px] font-medium tracking-wide" aria-hidden="true">
          {badge}
        </span>
      </button>

      <button
        type="button"
        onClick={onCyclePlacement}
        aria-label={`موضع الترجمة: ${PLACEMENT_LABELS[placement]}. انقر لنقلها إلى ${PLACEMENT_LABELS[nextPlacement(placement)]}`}
        title="نقل الترجمة بين أسفل الفيديو ومنتصفه وأعلاه"
        className={BUTTON_CLASSES}
      >
        <PlacementIcon size={15} aria-hidden="true" />
      </button>
    </div>
  )
}
