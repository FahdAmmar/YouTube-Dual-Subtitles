import { useEffect } from 'react'
import { WordDefinitionCard } from '@/components/console/WordDefinitionCard'
import type { WordSelection } from '@/types/subtitle.types'

interface VideoWordCardProps {
  selection: WordSelection
  /** Language of the word (the translation track) */
  languageCode: string
  /** Language the meaning is shown in (the source track) */
  nativeLanguageCode: string
  onClose: () => void
}

/**
 * Meaning of a word picked on the video. Same card as the sidebar transcript (same lookup, cache, glossary and
 * privacy switch), but anchored inside the stage so it also works in fullscreen, where the sidebar is not visible.
 */
export function VideoWordCard({ selection, languageCode, nativeLanguageCode, onClose }: VideoWordCardProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      role="region"
      aria-label="معنى الكلمة المحددة"
      // Phones: the stage is too short to hold the card, so it becomes a bottom sheet. md+: anchored inside the video.
      className="fixed inset-x-3 bottom-3 z-40 max-h-[55vh] overflow-y-auto rounded-md shadow-elevated md:absolute md:inset-x-auto md:bottom-auto md:end-3 md:top-16 md:z-20 md:max-h-[calc(100%-9.5rem)] md:w-80"
    >
      <WordDefinitionCard
        word={selection.word}
        languageCode={languageCode}
        nativeLanguageCode={nativeLanguageCode}
        sentence={selection.sentence}
        sentenceTime={selection.time}
        onClose={onClose}
      />
    </div>
  )
}
