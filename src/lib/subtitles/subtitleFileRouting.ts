import { SUPPORTED_SUBTITLE_EXTENSIONS } from './parseSubtitleFile'

export interface TrackAssignment {
  source?: File
  translation?: File
}

const TIMESTAMP_ARROW_PATTERN = /\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}\s*-->\s*\d{1,2}:\d{2}/

function hasSubtitleExtension(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return (SUPPORTED_SUBTITLE_EXTENSIONS as readonly string[]).includes(extension)
}

export function filterSubtitleFiles(files: File[]): File[] {
  return files.filter(hasSubtitleExtension)
}

/**
 * One file fills the first empty track (the translation once the source is loaded);
 * two files are taken as source then translation. Extra files are ignored.
 */
export function assignFilesToTracks(files: File[], isSourceLoaded: boolean): TrackAssignment {
  const [first, second] = files
  if (!first) return {}
  if (second) return { source: first, translation: second }
  return isSourceLoaded ? { translation: first } : { source: first }
}

/** Pasted subtitle text becomes a file so it follows the exact same parsing path */
export function textToSubtitleFile(text: string): File | null {
  if (!TIMESTAMP_ARROW_PATTERN.test(text)) return null
  const isVtt = text.trimStart().startsWith('WEBVTT')
  return new File([text], isVtt ? 'pasted.vtt' : 'pasted.srt', { type: 'text/plain' })
}
