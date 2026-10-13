import { tokenizeIntoWords, isWhitespaceToken, stripSurroundingPunctuation } from '@/lib/utils/wordTokenize'

interface ClickableWordsProps {
  text: string
  onWordClick: (word: string) => void
}

/** Splits a line into buttons per word; whitespace stays as plain text so wrapping and newlines are unchanged */
export function ClickableWords({ text, onWordClick }: ClickableWordsProps) {
  return (
    <>
      {tokenizeIntoWords(text).map((token, index) => {
        const word = isWhitespaceToken(token) ? '' : stripSurroundingPunctuation(token)
        if (!word) return <span key={index}>{token}</span>
        return (
          <button
            key={index}
            type="button"
            onClick={() => onWordClick(word)}
            className="cursor-pointer rounded-sm transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
          >
            {token}
          </button>
        )
      })}
    </>
  )
}
