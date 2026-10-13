import { createContext, useContext } from 'react'

/**
 * Key (see videoKey.ts) of the video being watched, or null on the start screen.
 * Lets deep components such as the word card record where a word was met without
 * threading the video through every list and card in between.
 */
const VideoKeyContext = createContext<string | null>(null)

export const VideoKeyProvider = VideoKeyContext.Provider

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrentVideoKey(): string | null {
  return useContext(VideoKeyContext)
}
