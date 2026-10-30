import { useEffect, useMemo, useRef } from 'react'
import { measureElement, observeElementRect, useVirtualizer } from '@tanstack/react-virtual'
import { useClockSelector } from '@/hooks/usePlayerTime'
import { makeBookmarkId } from '@/lib/utils/bookmarkStore'
import { findActiveCue } from '@/lib/subtitles/findActiveCue'
import { SliceCard } from './SliceCard'
import { EmptyTranscriptState } from './EmptyTranscriptState'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { ViewMode } from '@/types/theme.types'

/** A typical card is two short lines plus padding; the real height is measured once a card is on screen */
const ESTIMATED_SLICE_HEIGHT_PX = 84
/** Cards kept rendered beyond the visible ones, so a fast scroll never shows an empty gap */
const OVERSCAN_SLICES = 8
/**
 * Where nothing has a size (jsdom, or a panel hidden by CSS) the virtualizer would render nothing at all.
 * Two guards, both replaced by the real sizes as soon as there are any:
 * a container with no height is treated as a normal screen, and a card measured at 0px keeps its estimated height.
 * The second one matters as much as the first: if cards were recorded at 0px, every card would "fit" in the
 * screen and all of them would be rendered, which is exactly what the virtual list exists to avoid
 */
const FALLBACK_VIEWPORT_PX = 800

interface TranscriptListProps {
  slices: PairedSlice[]
  getCurrentTime: () => number
  viewMode: ViewMode
  /** originalIndex of the segment revealed in recall mode, or null */
  revealedIndex: number | null
  bookmarkedIds: ReadonlySet<string>
  onToggleBookmark: (slice: PairedSlice) => void
  /** The favourites filter is on: an empty list means nothing is bookmarked yet */
  isBookmarksOnly?: boolean
  onSeek: (seconds: number) => void
  /** رموز لغة المسارين (ISO 639-1) — تُمرَّر لأزرار نطق المقطع في كل بطاقة */
  translationLang?: string
  sourceLang?: string
  /**
   * صحيح أثناء وجود عبارة بحث نشطة — يُستخدم لأمرين معاً: (1) تعطيل
   * التمرير التلقائي للمقطع النشط، فلا يُفلت هذا التمرير قائمة نتائج
   * البحث من تحت يد المستخدم كل بضع ثوانٍ بينما يتصفّحها يدوياً أثناء
   * استمرار تشغيل الفيديو في الخلفية، (2) اختيار رسالة الحالة الفارغة
   * الصحيحة ("لا نتائج مطابقة" بدل "ارفع ملف ترجمة" المُضلِّلة لو كان
   * هناك نص محمَّل فعلاً ولم يُطابق البحث أي مقطع منه فقط)
   */
  isSearchActive?: boolean
}

/**
 * لوحة النص المتزامن الكاملة — تعرض كل مقاطع الفيديو مرتبة زمنياً، مع
 * تمييز المقطع الموافق للحظة الحالية من التشغيل، والتمرير التلقائي إليه
 * بحيث يبقى ظاهراً دوماً وسط المقاطع السابقة واللاحقة (تحقيق مباشر لمتطلب
 * "قراءة النص السابق والتالي" — القارئ يرى السياق كاملاً وليس السطر
 * الحالي فقط، خلافاً للترجمة المُطبَّقة فوق الفيديو التي تعرض سطراً واحداً)
 *
 * ملاحظة أداء: يشترك هذا المكوّن في الساعة المشتركة عبر useClockSelector، فيُعاد رسمه عند تغيّر المقطع النشط
 * فقط (مرة كل بضع ثوانٍ) لا عند كل نبضة وقت (5 مرات في الثانية)
 *
 * القائمة افتراضية (virtualized): لا يوجد في الـ DOM إلا المقاطع الظاهرة وما حولها مهما طال الفيديو.
 * قبل ذلك كانت كل المقاطع تُرسم دفعة واحدة (≈27 عقدة DOM لكل مقطع، أي أكثر من 80 ألف عقدة
 * عند 3000 مقطع) وهو ما تمنعه قاعدة performance.md في وضع القراءة أيضاً
 */
export function TranscriptList({
  slices,
  getCurrentTime,
  viewMode,
  revealedIndex,
  bookmarkedIds,
  onToggleBookmark,
  isBookmarksOnly,
  onSeek,
  translationLang,
  sourceLang,
  isSearchActive,
}: TranscriptListProps) {
  // Re-renders when the active slice changes, not on every clock tick; the live progress bar of the active card
  // subscribes to the clock by itself (see SliceCard), so the list is not walked five times a second
  const activeSlice = useClockSelector(getCurrentTime, (time) => findActiveCue(slices, time))

  // Hashed once per slice list, not on every playback tick
  const bookmarkIdBySliceId = useMemo(
    () => new Map(slices.map((slice) => [slice.id, makeBookmarkId(slice)])),
    [slices],
  )

  const listContainerRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: slices.length,
    getScrollElement: () => listContainerRef.current,
    estimateSize: () => ESTIMATED_SLICE_HEIGHT_PX,
    overscan: OVERSCAN_SLICES,
    getItemKey: (index) => slices[index]?.id ?? index,
    initialRect: { width: 0, height: FALLBACK_VIEWPORT_PX },
    measureElement: (element, entry, instance) => {
      const measured = measureElement(element, entry, instance)
      return measured > 0 ? measured : ESTIMATED_SLICE_HEIGHT_PX
    },
    observeElementRect: (instance, report) =>
      observeElementRect(instance, (rect) =>
        report(rect.height > 0 ? rect : { width: rect.width, height: FALLBACK_VIEWPORT_PX }),
      ),
  })

  // Position of the active slice in the list; it only changes when the active slice does, not on every tick
  const activeIndex = useMemo(() => (activeSlice ? slices.indexOf(activeSlice) : -1), [slices, activeSlice])

  useEffect(() => {
    // تمرير سلس للمقطع النشط إلى منتصف منطقة الرؤية، فقط عند تغيّره فعلياً
    // (وليس عند كل نبضة وقت) لتفادي "قفزات" تمرير مزعجة أثناء المشاهدة
    //
    // الحارس typeof ... === 'function' + try/catch يبقيان: في بيئات لا تُنفَّذ فيها واجهة التمرير بالكامل
    // (متصفحات مضمّنة، إطارات معاينة مقيّدة، jsdom) كان أي استثناء هنا يصل إلى ErrorBoundary الجذري
    // ويستبدل الصفحة بشاشة الخطأ. وبما أن المقطع النشط قد لا يكون مرسوماً أصلاً (قائمة افتراضية)،
    // نطلب من virtualizer نفسه التمرير إليه بدل scrollIntoView على عنصر قد لا يوجد
    if (isSearchActive || activeIndex < 0) return
    const container = listContainerRef.current
    if (!container || typeof container.scrollTo !== 'function') return
    const frame = requestAnimationFrame(() => {
      try {
        virtualizer.scrollToIndex(activeIndex, { align: 'center', behavior: 'smooth' })
      } catch {
        // تجاهل بأمان
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [activeIndex, isSearchActive, virtualizer])

  if (slices.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <EmptyTranscriptState reason={isSearchActive ? 'no-matches' : isBookmarksOnly ? 'no-bookmarks' : 'no-subtitles'} />
      </div>
    )
  }

  return (
    <div ref={listContainerRef} className="flex-1 overflow-y-auto px-2 py-2">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const slice = slices[item.index]
          if (!slice) return null
          const isActive = activeSlice?.id === slice.id

          return (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute inset-x-0 top-0 pb-0.5"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <SliceCard
                slice={slice}
                index={slice.originalIndex}
                isActive={isActive}
                viewMode={viewMode}
                isTranslationRevealed={isActive && slice.originalIndex === revealedIndex}
                isBookmarked={bookmarkedIds.has(bookmarkIdBySliceId.get(slice.id) ?? '')}
                onToggleBookmark={onToggleBookmark}
                onSeek={onSeek}
                translationLang={translationLang}
                sourceLang={sourceLang}
                getCurrentTime={getCurrentTime}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
