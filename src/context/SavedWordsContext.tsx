import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import { GLOSSARY_CHANGED_EVENT, getGlossaryEntries } from '@/lib/utils/glossaryStore'
import { buildSavedWordSet, isSavedWord } from '@/lib/utils/savedWords'

interface SavedWordsContextValue {
  /** Whether a word, as it appears in a line, is already in the vocabulary (always false when the highlight is off) */
  isSaved: (rawWord: string) => boolean
  isHighlightEnabled: boolean
  setHighlightEnabled: (enabled: boolean) => void
}

const NO_HIGHLIGHT: SavedWordsContextValue = {
  isSaved: () => false,
  isHighlightEnabled: true,
  setHighlightEnabled: () => {},
}

const SavedWordsContext = createContext<SavedWordsContextValue>(NO_HIGHLIGHT)

interface SavedWordsProviderProps {
  /** Language of the track the learner is studying: only words saved in this language are marked */
  languageCode: string
  children: ReactNode
}

/**
 * One shared copy of the saved words for every subtitle line on screen. Thousands of words can be rendered
 * (reading mode), so each one asks this set instead of reading storage itself.
 */
export function SavedWordsProvider({ languageCode, children }: SavedWordsProviderProps) {
  const [entries, setEntries] = useState(() => getGlossaryEntries())
  const [isHighlightEnabled, setHighlightEnabled] = useLocalStorage<boolean>(STORAGE_KEYS.HIGHLIGHT_SAVED_WORDS, true)

  useEffect(() => {
    const refresh = () => setEntries(getGlossaryEntries())
    const onStorage = (event: StorageEvent) => {
      // Another tab changed the vocabulary (key is null when storage was cleared)
      if (event.key === null || event.key === STORAGE_KEYS.GLOSSARY) refresh()
    }
    window.addEventListener(GLOSSARY_CHANGED_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(GLOSSARY_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const savedWords = useMemo(() => buildSavedWordSet(entries, languageCode), [entries, languageCode])

  const value = useMemo<SavedWordsContextValue>(
    () => ({
      isSaved: isHighlightEnabled ? (rawWord) => isSavedWord(savedWords, rawWord) : () => false,
      isHighlightEnabled,
      setHighlightEnabled,
    }),
    [savedWords, isHighlightEnabled, setHighlightEnabled],
  )

  return <SavedWordsContext.Provider value={value}>{children}</SavedWordsContext.Provider>
}

/** Without a provider nothing is marked, so a component can be rendered on its own */
// eslint-disable-next-line react-refresh/only-export-components -- provider and hook of one context live together, as in the other contexts
export function useSavedWords(): SavedWordsContextValue {
  return useContext(SavedWordsContext)
}
