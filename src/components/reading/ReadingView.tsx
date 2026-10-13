import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { X, LocateFixed, FileText } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { ReadingCard } from './ReadingCard'
import { ReadingDock } from './ReadingDock'
import { ReadingTools } from './ReadingTools'
import { NowPlayingCard } from './NowPlayingCard'
import { useCurrentSlice } from '@/hooks/useCurrentSlice'
import { useLineLoop } from '@/hooks/useLineLoop'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useReadingPrefs } from '@/hooks/useReadingPrefs'
import { useSubtitleSettings } from '@/context/SubtitleSettingsContext'
import { useThemeContext } from '@/context/ThemeContext'
import { ensureReadableColor } from '@/lib/utils/color'
import { copyToClipboard } from '@/lib/utils/copyToClipboard'
import { makeBookmarkId } from '@/lib/utils/bookmarkStore'
import { READING_FONT_SCALES } from '@/lib/utils/readingPrefs'
import { formatSliceText, formatTranscriptText, type CopyScope } from '@/lib/subtitles/formatTranscript'
import { filterSlicesByQuery } from '@/lib/subtitles/filterSlices'
import { YT_PLAYER_STATE } from '@/types/youtube.types'
import type { UseVideoPlayerResult } from '@/hooks/useVideoPlayer'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { ViewMode } from '@/types/theme.types'

const FEEDBACK_MS = 2200
// A 2-hour video has thousands of lines: only those near the screen are in the DOM
const ESTIMATED_CARD_HEIGHT_PX = 150
const OVERSCAN_CARDS = 8
const FALLBACK_VIEWPORT_PX = 800
const MAX_SMOOTH_SCREENS = 1.5
// Subtitle colours are picked to read on dark video. On a card they must reach this contrast (WCAG AA needs 4.5,
// and the active card's tint plus the word highlight lower the margin), against the lightest/darkest card tint.
const READABLE_CONTRAST = 6.5
const CARD_SURFACE = { dark: [26, 32, 38], light: [226, 232, 240] } as const
// After an instant move the estimated card heights are replaced by measured ones, which shifts the layout:
// keep correcting until the card has stayed centred for a while (or give up after a moment)
const SETTLE_TOLERANCE_PX = 4
const SETTLE_STABLE_FRAMES = 15
const SETTLE_MAX_MS = 2000

interface ReadingViewProps {
  player: UseVideoPlayerResult
  slices: PairedSlice[]
  title: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  revealedIndex: number | null
  bookmarkedIds: ReadonlySet<string>
  onToggleBookmark: (slice: PairedSlice) => void
  sourceLanguageCode: string
  translationLanguageCode: string
  /**
   * True when the video stays on screen. YouTube and Vimeo terms forbid hiding the
   * player or playing only its audio, so for them this is always true.
   */
  isVideoVisible: boolean
  canHideVideo: boolean
  onToggleVideoHidden: () => void
  onClose: () => void
  onOpenSettings: () => void
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * Reading mode: the transcript as a list of cards that follows the audio, with the
 * word being spoken highlighted, next to a large docked video (the video element
 * itself is positioned by AppShell, this view only reserves its space).
 */
export function ReadingView(props: ReadingViewProps) {
  const { player, slices, viewMode, bookmarkedIds, isVideoVisible } = props
  const { settings } = useSubtitleSettings()
  const [prefs, updatePrefs] = useReadingPrefs()
  const { resolvedTheme } = useThemeContext()
  const [isLooping, setIsLooping] = useState(false)
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const [isFollowing, setIsFollowing] = useState(true)
  const [query, setQuery] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isPlaying = player.playerState === YT_PLAYER_STATE.PLAYING
  const current = useCurrentSlice(slices, player.getCurrentTime)
  useLineLoop(isLooping, slices, current, player)
  useWakeLock(isPlaying)

  // While searching, only matching lines are listed and the view stays at the top instead of following playback
  const isSearching = query.trim() !== ''
  const visibleSlices = useMemo(() => filterSlicesByQuery(slices, query), [slices, query])

  const virtualizer = useVirtualizer({
    count: visibleSlices.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT_PX,
    overscan: OVERSCAN_CARDS,
    getItemKey: (index) => visibleSlices[index]?.id ?? index,
    // Before the first measurement (and where there is no layout at all) assume a normal screen
    initialRect: { width: 0, height: FALLBACK_VIEWPORT_PX },
  })

  const sourceColor = useMemo(
    () => ensureReadableColor(settings.trackA.color, CARD_SURFACE[resolvedTheme], READABLE_CONTRAST),
    [settings.trackA.color, resolvedTheme],
  )
  const translationColor = useMemo(
    () => ensureReadableColor(settings.trackB.color, CARD_SURFACE[resolvedTheme], READABLE_CONTRAST),
    [settings.trackB.color, resolvedTheme],
  )

  const fontScale = READING_FONT_SCALES[prefs.fontScaleIndex] ?? 1
  // Sizes follow the role, not the track: the lead text is the larger of the two settings
  const primaryFontSize = Math.max(settings.trackA.fontSize, settings.trackB.fontSize)
  const secondaryFontSize = Math.min(settings.trackA.fontSize, settings.trackB.fontSize)

  const bookmarkedPositions = useMemo(() => {
    const positions = new Set<number>()
    for (const slice of slices) {
      if (bookmarkedIds.has(makeBookmarkId(slice))) positions.add(slice.originalIndex)
    }
    return positions
  }, [slices, bookmarkedIds])

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    }
  }, [])

  // Keeps the current card centred, unless the user scrolled away on purpose
  useEffect(() => {
    if (!isFollowing || isSearching || current.index < 0) return
    const container = scrollRef.current
    if (!container || typeof container.scrollTo !== 'function') return
    const list = container

    function findCard(): HTMLElement | null {
      return list.querySelector<HTMLElement>(`[data-reading-index="${current.index}"]`)
    }
    /** The scroll position that puts the card in the middle of the list */
    function getCentredTop(card: HTMLElement): number {
      const cardTop = card.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop
      return cardTop - list.clientHeight / 2 + card.offsetHeight / 2
    }

    const card = findCard()
    if (card) {
      const top = getCentredTop(card)
      const isLongMove = Math.abs(top - list.scrollTop) > list.clientHeight * MAX_SMOOTH_SCREENS
      if (!isLongMove) {
        // A short move (the normal line-to-line case) animates; there is nothing to settle
        try {
          list.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
        } catch {
          // Scrolling is cosmetic: a failure must never break playback
        }
        return
      }
      list.scrollTo({ top, behavior: 'auto' })
    } else {
      // Far outside the rendered window (after a long seek): let the virtualizer bring it into view
      virtualizer.scrollToIndex(current.index, { align: 'center' })
    }

    const startedAt = performance.now()
    let stableFrames = 0
    let frameId = 0
    function settle() {
      const settledCard = findCard()
      if (settledCard) {
        const top = getCentredTop(settledCard)
        if (Math.abs(top - list.scrollTop) > SETTLE_TOLERANCE_PX) {
          list.scrollTo({ top, behavior: 'auto' })
          stableFrames = 0
        } else {
          stableFrames += 1
        }
      }
      if (stableFrames < SETTLE_STABLE_FRAMES && performance.now() - startedAt < SETTLE_MAX_MS) {
        frameId = requestAnimationFrame(settle)
      }
    }
    frameId = requestAnimationFrame(settle)
    return () => cancelAnimationFrame(frameId)
  }, [current.index, isFollowing, isSearching, virtualizer])

  // Back to the top when the query changes, but not on first render: that would undo the centring on the current line
  const previousQueryRef = useRef(query)
  useEffect(() => {
    if (previousQueryRef.current === query) return
    previousQueryRef.current = query
    if (typeof scrollRef.current?.scrollTo === 'function') scrollRef.current.scrollTo({ top: 0 })
  }, [query])

  const showFeedback = useCallback((message: string) => {
    setFeedback(message)
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), FEEDBACK_MS)
  }, [])

  const copyText = useCallback(
    async (text: string, successMessage: string) => {
      const copied = await copyToClipboard(text)
      showFeedback(copied ? successMessage : 'تعذّر النسخ، حدّد النص وانسخه يدوياً')
    },
    [showFeedback],
  )

  const handleCopyAll = useCallback(
    (scope: CopyScope) => void copyText(formatTranscriptText(slices, scope), 'تم نسخ النص'),
    [slices, copyText],
  )
  const handleCopySlice = useCallback(
    (slice: PairedSlice) => void copyText(formatSliceText(slice, 'both'), 'تم نسخ المقطع'),
    [copyText],
  )
  const { seekTo } = player
  const handleSeek = useCallback(
    (slice: PairedSlice) => {
      setIsFollowing(true)
      seekTo(slice.start)
    },
    [seekTo],
  )

  const hasSlices = slices.length > 0

  return (
    <section aria-label="وضع القراءة" className="fixed inset-0 z-30 flex flex-col bg-bg text-text-primary">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Start column: reserves the video's space (the player is fixed on top of it), then the tools */}
        <div className="flex shrink-0 flex-col lg:w-[calc(var(--reading-video-width)+3rem)] lg:ps-6">
          {isVideoVisible ? (
            <div aria-hidden="true" className="aspect-video w-full lg:order-2 lg:w-[var(--reading-video-width)]" />
          ) : (
            <NowPlayingCard
              title={props.title}
              isPlaying={isPlaying}
              className="mx-3 mt-3 lg:order-2 lg:mx-0 lg:mt-0 lg:w-[var(--reading-video-width)]"
            />
          )}

          <header className="flex items-center gap-2 px-3 py-2 lg:order-1 lg:h-[4.5rem] lg:px-0">
            <IconButton
              aria-label="إغلاق وضع القراءة"
              onClick={props.onClose}
              className="h-10 w-10 rounded-full bg-surface-elevated"
            >
              <X size={20} aria-hidden="true" />
            </IconButton>
            <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-text-secondary rtl:text-right ltr:text-left" dir="auto">
              {props.title}
            </h2>
          </header>

          <ReadingTools
            className={`px-3 pb-3 lg:order-3 lg:flex lg:px-0 lg:pt-5 ${isToolsOpen ? 'flex' : 'hidden'}`}
            viewMode={viewMode}
            onViewModeChange={props.onViewModeChange}
            sourceLanguageCode={props.sourceLanguageCode}
            translationLanguageCode={props.translationLanguageCode}
            prefs={prefs}
            onPrefsChange={updatePrefs}
            isLooping={isLooping}
            onToggleLoop={() => setIsLooping((previous) => !previous)}
            onCopyAll={handleCopyAll}
            onOpenSettings={props.onOpenSettings}
            canHideVideo={props.canHideVideo}
            isVideoHidden={!isVideoVisible}
            onToggleVideoHidden={props.onToggleVideoHidden}
            query={query}
            onQueryChange={setQuery}
            resultCount={visibleSlices.length}
          />
        </div>

        {/* List column */}
        <div className="relative min-h-0 flex-1">
          {hasSlices ? (
            <div
              ref={scrollRef}
              // Only user-driven input stops the auto-follow; programmatic scrolling never fires these
              onWheel={() => setIsFollowing(false)}
              onTouchMove={() => setIsFollowing(false)}
              className="relative h-full overflow-y-auto overscroll-contain px-2 [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)] sm:px-4"
            >
              <div className="mx-auto max-w-2xl py-[35vh]">
                <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
                  {virtualizer.getVirtualItems().map((item) => {
                    const slice = visibleSlices[item.index]
                    if (!slice) return null
                    return (
                      <div
                        key={item.key}
                        data-index={item.index}
                        ref={virtualizer.measureElement}
                        className="absolute inset-x-0 top-0 pb-1.5"
                        style={{ transform: `translateY(${item.start}px)` }}
                      >
                        <ReadingCard
                          slice={slice}
                          status={
                            slice.originalIndex < current.index ||
                            (slice.originalIndex === current.index && !current.isActive)
                              ? 'past'
                              : slice.originalIndex === current.index
                                ? 'active'
                                : 'future'
                          }
                          viewMode={viewMode}
                          isRevealed={props.revealedIndex === slice.originalIndex}
                          isSwapped={prefs.isSwapped}
                          showTimestamp={prefs.showTimestamps}
                          fontScale={fontScale}
                          primaryFontSize={primaryFontSize}
                          secondaryFontSize={secondaryFontSize}
                          sourceColor={sourceColor}
                          translationColor={translationColor}
                          sourceLang={props.sourceLanguageCode}
                          translationLang={props.translationLanguageCode}
                          isBookmarked={bookmarkedPositions.has(slice.originalIndex)}
                          getCurrentTime={player.getCurrentTime}
                          onSeek={handleSeek}
                          onCopy={handleCopySlice}
                          onToggleBookmark={props.onToggleBookmark}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <FileText size={32} className="text-text-secondary" aria-hidden="true" />
              <p className="max-w-sm text-text-secondary">
                لا توجد ترجمة لعرضها بعد. ارفع ملف ترجمة واحداً على الأقل ثم عد إلى وضع القراءة.
              </p>
              <Button variant="secondary" size="sm" onClick={props.onClose}>
                العودة لرفع الترجمة
              </Button>
            </div>
          )}

          {isSearching && visibleSlices.length === 0 && (
            <p className="absolute inset-x-0 top-24 px-6 text-center text-sm text-text-secondary">
              لا توجد نتائج لـ «{query.trim()}»
            </p>
          )}

          {hasSlices && !isFollowing && !isSearching && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto flex w-fit">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsFollowing(true)}
                className="pointer-events-auto shadow-elevated"
              >
                <LocateFixed size={14} aria-hidden="true" />
                العودة إلى المقطع الحالي
              </Button>
            </div>
          )}

          <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 top-3 mx-auto flex w-fit">
            {feedback && (
              <span className="rounded-full border border-border bg-surface-elevated px-3.5 py-1.5 text-sm shadow-elevated animate-fade-in">
                {feedback}
              </span>
            )}
          </div>
        </div>
      </div>

      <ReadingDock
        player={player}
        slices={slices}
        currentIndex={current.index}
        onSeekToSlice={handleSeek}
        isToolsOpen={isToolsOpen}
        onToggleTools={() => setIsToolsOpen((previous) => !previous)}
      />
    </section>
  )
}
