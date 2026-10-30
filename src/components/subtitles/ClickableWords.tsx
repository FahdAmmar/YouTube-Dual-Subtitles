import { useSavedWords } from '@/context/SavedWordsContext'
import { cn } from '@/lib/utils/cn'
import { tokenizeIntoWords, isWhitespaceToken, stripSurroundingPunctuation } from '@/lib/utils/wordTokenize'

interface ClickableWordsProps {
  text: string
  onWordClick: (word: string) => void
}

/** Splits a line into buttons per word; whitespace stays as plain text so wrapping and newlines are unchanged */
/** A dotted underline, not only a colour, marks a saved word, so it shows for colour-blind learners too */
export const SAVED_WORD_CLASSES = 'underline decoration-dotted decoration-2 underline-offset-4'

export function ClickableWords({ text, onWordClick }: ClickableWordsProps) {
  const { isSaved } = useSavedWords()
  return (
    <>
      {tokenizeIntoWords(text).map((token, index) => {
        const word = isWhitespaceToken(token) ? '' : stripSurroundingPunctuation(token)
        if (!word) return <span key={index}>{token}</span>
        const saved = isSaved(word)
        return (
          <button
            key={index}
            type="button"
            onClick={() => onWordClick(word)}
            data-saved={saved ? 'true' : undefined}
            aria-label={saved ? `${token}، محفوظة في المفردات` : undefined}
            className={cn(
              'cursor-pointer rounded-sm transition-colors hover:bg-white/25 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console',
              saved && SAVED_WORD_CLASSES,
            )}
          >
            {token}
          </button>
        )
      })}
    </>
  )
}
