import type { PairedSlice } from './pairCues'

export type CopyScope = 'both' | 'source' | 'translation'

export function formatSliceText(slice: PairedSlice, scope: CopyScope): string {
  const lines: string[] = []
  if (scope !== 'translation' && slice.sourceText?.trim()) lines.push(slice.sourceText.trim())
  if (scope !== 'source' && slice.translationText?.trim()) lines.push(slice.translationText.trim())
  return lines.join('\n')
}

/** Plain text for the clipboard: bilingual pairs are separated by a blank line */
export function formatTranscriptText(slices: PairedSlice[], scope: CopyScope): string {
  const separator = scope === 'both' ? '\n\n' : '\n'
  return slices
    .map((slice) => formatSliceText(slice, scope))
    .filter(Boolean)
    .join(separator)
}
