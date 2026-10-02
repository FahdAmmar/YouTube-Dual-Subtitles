import { useCallback, useEffect, useState } from 'react'
import { getBookmarkIds, toggleBookmarkId } from '@/lib/utils/bookmarkStore'

export interface UseBookmarksResult {
  bookmarkedIds: ReadonlySet<string>
  /** Returns true when added, false when removed (false too when there is no video) */
  toggleBookmark: (id: string) => boolean
}

const NO_BOOKMARKS: ReadonlySet<string> = new Set()

export function useBookmarks(videoKey: string | null): UseBookmarksResult {
  const [bookmarkedIds, setBookmarkedIds] = useState<ReadonlySet<string>>(() =>
    videoKey ? getBookmarkIds(videoKey) : NO_BOOKMARKS,
  )

  useEffect(() => {
    setBookmarkedIds(videoKey ? getBookmarkIds(videoKey) : NO_BOOKMARKS)
  }, [videoKey])

  const toggleBookmark = useCallback(
    (id: string): boolean => {
      if (!videoKey) return false
      const added = toggleBookmarkId(videoKey, id)
      setBookmarkedIds((previous) => {
        const next = new Set(previous)
        if (added) next.add(id)
        else next.delete(id)
        return next
      })
      return added
    },
    [videoKey],
  )

  return { bookmarkedIds, toggleBookmark }
}
