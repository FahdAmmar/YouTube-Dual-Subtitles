import { memo, useMemo, useState } from 'react'
import { Copy, Star, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { buildWordTimeline, getActiveWordIndex, getActiveWordIndexAt, getSpeechProgress } from '@/lib/subtitles/wordTiming'
import { getVisibleTracks } from '@/lib/subtitles/visibleTracks'
import { stripSurroundingPunctuation } from '@/lib/utils/wordTokenize'
import { isSpeechSupported, speakText } from '@/lib/utils/textToSpeech'
import { formatClock } from '@/lib/utils/formatClock'
import { useLineClock } from '@/hooks/useLineClock'
import { WordDefinitionCard } from '@/components/console/WordDefinitionCard'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { CueWord } from '@/types/subtitle.types'
import type { ViewMode } from '@/types/theme.types'

export type LineStatus = 'past' | 'active' | 'future'

interface ReadingCardProps {
  slice: PairedSlice
  status: LineStatus
  viewMode: ViewMode
  /** Recall mode: has this line's translation been revealed? */
  isRevealed: boolean
  isSwapped: boolean
  showTimestamp: boolean
  fontScale: number
  /** Settings sizes already resolved by role: largest track for the lead text, smallest for the support text */
  primaryFontSize: number
  secondaryFontSize: number
  sourceColor: string
  translationColor: string
  sourceLang: string
  translationLang: string
  isBookmarked: boolean
  getCurrentTime: () => number
  onSeek: (slice: PairedSlice) => void
  onCopy: (slice: PairedSlice) => void
  onToggleBookmark: (slice: PairedSlice) => void
}

const PRIMARY_SIZE_MULTIPLIER = 1.1
const SECONDARY_SIZE_MULTIPLIER = 0.85
const PHONE_SIZE_RATIO = 0.8
/** Viewport width (px) from which text reaches its full size */
const FULL_SIZE_VIEWPORT_PX = 1000

/** Fluid size: compact on phones, full size from large tablets up */
function toFontSize(settingsPx: number, multiplier: number, fontScale: number): string {
  const max = Math.round(settingsPx * multiplier * fontScale)
  const min = Math.round(max * PHONE_SIZE_RATIO)
  const vw = ((max / FULL_SIZE_VIEWPORT_PX) * 100).toFixed(2)
  return `clamp(${min}px, ${vw}vw, ${max}px)`
}

function getActiveIndex(
  timeline: ReturnType<typeof buildWordTimeline>,
  timings: readonly CueWord[] | undefined,
  clock: LineClock | null,
): number {
  if (clock === null) return -1
  // Real timings are only trusted when they cover exactly the words that are shown
  if (timings && timings.length === timeline.wordEnds.length) {
    return getActiveWordIndexAt(timings, clock.time, clock.end)
  }
  return getActiveWordIndex(timeline, getSpeechProgress(clock.time, clock.start, clock.end))
}

/** Where the player is within the line being read */
interface LineClock {
  time: number
  start: number
  end: number
}

interface WordsProps {
  text: string
  /** Null for lines not being read: words are then only rendered so they can be looked up */
  clock: LineClock | null
  /** Real start of every word, when the subtitle file carried it; otherwise the highlight is estimated */
  timings?: readonly CueWord[]
  highlightColor: string
  /**
   * How progress shows without lowering contrast below what the line's base colour already has:
   * lead text dims its upcoming words; support text brightens the words already read.
   */
  variant: 'lead' | 'support'
  onWordClick?: (rawWord: string) => void
}

function Words({ text, clock, timings, highlightColor, variant, onWordClick }: WordsProps) {
  const timeline = useMemo(() => buildWordTimeline(text), [text])
  const activeIndex = getActiveIndex(timeline, timings, clock)

  return (
    <>
      {timeline.tokens.map((token, position) => {
        if (token.wordIndex === -1) return token.text
        const isCurrent = token.wordIndex === activeIndex
        return (
          <span
            key={position}
            data-word-state={clock === null ? undefined : isCurrent ? 'current' : token.wordIndex < activeIndex ? 'read' : 'upcoming'}
            onClick={
              onWordClick
                ? (event) => {
                    // A word click opens its meaning; it must not also move the video
                    event.stopPropagation()
                    onWordClick(token.text)
                  }
                : undefined
            }
            className={cn(
              '-mx-0.5 rounded px-0.5 transition-[opacity,background-color] duration-150 motion-reduce:transition-none',
              onWordClick && 'cursor-pointer hover:bg-console/15',
              clock !== null && variant === 'lead' && token.wordIndex > activeIndex && 'opacity-75',
              clock !== null && variant === 'support' && token.wordIndex <= activeIndex && 'text-text-primary',
            )}
            style={
              isCurrent ? { backgroundColor: `color-mix(in srgb, ${highlightColor} 14%, transparent)` } : undefined
            }
          >
            {token.text}
          </span>
        )
      })}
    </>
  )
}

interface TextsProps {
  primaryText: string | null
  secondaryText: string | null
  primaryColor: string
  secondaryColor: string
  isActive: boolean
  fontScale: number
  primaryFontSize: number
  secondaryFontSize: number
  clock: LineClock | null
  primaryWords?: readonly CueWord[]
  secondaryWords?: readonly CueWord[]
  hiddenNotice: boolean
  onPrimaryWordClick?: (rawWord: string) => void
}

const TEXT_ALIGN = 'rtl:text-right ltr:text-left'

function Texts(props: TextsProps) {
  return (
    <>
      {props.primaryText && (
        <p
          dir="auto"
          className={cn('font-bold leading-[1.6]', TEXT_ALIGN, !props.isActive && 'text-text-primary')}
          style={{
            fontSize: toFontSize(props.primaryFontSize, PRIMARY_SIZE_MULTIPLIER, props.fontScale),
            color: props.isActive ? props.primaryColor : undefined,
          }}
        >
          <Words
            text={props.primaryText}
            clock={props.clock}
            variant="lead"
            timings={props.primaryWords}
            highlightColor={props.primaryColor}
            onWordClick={props.onPrimaryWordClick}
          />
        </p>
      )}
      {props.hiddenNotice && (
        <p className="font-mono text-[11px] tracking-wide text-text-secondary">••• الترجمة مخفية</p>
      )}
      {props.secondaryText && (
        <p
          dir="auto"
          className={cn('leading-[1.7] text-text-secondary', TEXT_ALIGN)}
          style={{ fontSize: toFontSize(props.secondaryFontSize, SECONDARY_SIZE_MULTIPLIER, props.fontScale) }}
        >
          {props.clock === null ? (
            props.secondaryText
          ) : (
            <Words
              text={props.secondaryText}
              clock={props.clock}
              variant="support"
              timings={props.secondaryWords}
              highlightColor="rgb(var(--color-text-secondary))"
            />
          )}
        </p>
      )}
    </>
  )
}

/** Only the line being read polls the player clock */
function ActiveTexts(props: Omit<TextsProps, 'clock'> & { start: number; end: number; getCurrentTime: () => number }) {
  const { start, end, getCurrentTime, ...rest } = props
  const time = useLineClock(getCurrentTime)
  return <Texts {...rest} clock={{ time, start, end }} />
}

const ACTION_BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg/60 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console'

function ReadingCardComponent(props: ReadingCardProps) {
  const { slice, status, isSwapped } = props
  const [lookupWord, setLookupWord] = useState<string | null>(null)

  const visible = getVisibleTracks(props.viewMode, props.isRevealed)
  const source = { text: visible.source ? slice.sourceText : null, lang: props.sourceLang, color: props.sourceColor }
  const translation = {
    text: visible.translation ? slice.translationText : null,
    lang: props.translationLang,
    color: props.translationColor,
  }
  const primary = isSwapped ? source : translation
  const secondary = isSwapped ? translation : source

  const isTranslationHidden =
    props.viewMode === 'recall' && !props.isRevealed && Boolean(slice.translationText)
  if (!primary.text && !secondary.text && !isTranslationHidden) return null

  const isActive = status === 'active'
  const speakable = primary.text ?? secondary.text
  const speakLang = primary.text ? primary.lang : secondary.lang
  const canSpeak = isSpeechSupported() && Boolean(speakable)

  function seek() {
    // Dragging to select text must not count as a click that moves the video
    if (window.getSelection()?.toString()) return
    props.onSeek(slice)
  }

  const textsProps: Omit<TextsProps, 'clock'> = {
    primaryText: primary.text,
    secondaryText: secondary.text,
    primaryColor: primary.color,
    secondaryColor: secondary.color,
    primaryWords: isSwapped ? slice.sourceWords : slice.translationWords,
    secondaryWords: isSwapped ? slice.translationWords : slice.sourceWords,
    isActive,
    fontScale: props.fontScale,
    primaryFontSize: props.primaryFontSize,
    secondaryFontSize: props.secondaryFontSize,
    hiddenNotice: isTranslationHidden,
    onPrimaryWordClick: primary.lang
      ? (rawWord) => {
          const cleaned = stripSurroundingPunctuation(rawWord)
          if (cleaned) setLookupWord(cleaned)
        }
      : undefined,
  }

  return (
    <article
      data-reading-index={slice.originalIndex}
      data-status={status}
      aria-current={isActive ? 'true' : undefined}
      className={cn(
        'group relative flex gap-4 rounded-lg border-s-[3px] px-4 py-4 transition-[background-color,border-color,opacity,box-shadow] duration-300 motion-reduce:transition-none sm:px-5',
        isActive
          ? 'border-console bg-console/10 shadow-glow-console'
          : 'border-transparent hover:bg-surface/70',
        status === 'past' && 'opacity-70',
      )}
    >
      {props.showTimestamp && (
        <span
          dir="ltr"
          className={cn(
            'mt-1.5 w-11 shrink-0 font-mono text-xs tabular-nums',
            isActive ? 'text-text-primary' : 'text-text-secondary',
          )}
        >
          {formatClock(slice.start)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div
          role="button"
          tabIndex={0}
          onClick={seek}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            props.onSeek(slice)
          }}
          className="flex cursor-pointer select-text flex-col gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-console"
        >
          {isActive ? (
            <ActiveTexts
              {...textsProps}
              start={slice.start}
              end={slice.end}
              getCurrentTime={props.getCurrentTime}
            />
          ) : (
            <Texts {...textsProps} clock={null} />
          )}
        </div>

        {lookupWord && primary.lang && (
          <div className="mt-3">
            <WordDefinitionCard
              word={lookupWord}
              languageCode={primary.lang}
              nativeLanguageCode={secondary.lang}
              sentence={primary.text}
              sentenceTime={slice.start}
              onClose={() => setLookupWord(null)}
            />
          </div>
        )}
      </div>

      {/* Floats over the card's top edge so it never covers the first line of text */}
      <div
        className={cn(
          // Touch screens have no hover, so the actions stay visible there instead of being unreachable
          'absolute -top-[18px] end-3 flex gap-0.5 rounded-full border border-border bg-surface-elevated p-0.5 opacity-0 shadow-soft transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-75',
          isActive && 'opacity-100',
        )}
      >
        {canSpeak && (
          <button
            type="button"
            aria-label="نطق هذا المقطع بصوت الجهاز"
            onClick={() => speakText(speakable ?? '', speakLang)}
            className={ACTION_BUTTON}
          >
            <Volume2 size={14} aria-hidden="true" />
          </button>
        )}
        <button type="button" aria-label="نسخ هذا المقطع" onClick={() => props.onCopy(slice)} className={ACTION_BUTTON}>
          <Copy size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={props.isBookmarked ? 'إزالة المقطع من المفضلة' : 'إضافة المقطع إلى المفضلة'}
          aria-pressed={props.isBookmarked}
          onClick={() => props.onToggleBookmark(slice)}
          className={ACTION_BUTTON}
        >
          <Star size={14} aria-hidden="true" className={props.isBookmarked ? 'fill-current text-console' : undefined} />
        </button>
      </div>
    </article>
  )
}

/** Memoized so a card re-renders only when its own status or settings change */
export const ReadingCard = memo(ReadingCardComponent)
