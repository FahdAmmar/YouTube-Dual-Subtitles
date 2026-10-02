import type { ViewMode } from '@/types/theme.types'

export interface VisibleTracks {
  source: boolean
  translation: boolean
}

/**
 * Single rule for which tracks a view shows. "recall" keeps the source (the
 * prompt) and hides the translation (the answer) until the user reveals it.
 */
export function getVisibleTracks(viewMode: ViewMode, isTranslationRevealed: boolean): VisibleTracks {
  return {
    source: viewMode !== 'translation',
    translation: viewMode === 'recall' ? isTranslationRevealed : viewMode !== 'source',
  }
}
