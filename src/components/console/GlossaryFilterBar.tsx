import { Search } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/utils/cn'
import type { GlossaryFilters, GlossarySort, GlossaryStatusFilter } from '@/lib/utils/glossaryFilter'

const STATUS_OPTIONS: readonly { value: GlossaryStatusFilter; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'due', label: 'مستحقة' },
  { value: 'new', label: 'جديدة' },
  { value: 'learning', label: 'قيد التعلّم' },
  { value: 'mastered', label: 'متقنة' },
]

const SORT_OPTIONS: readonly { value: GlossarySort; label: string }[] = [
  { value: 'newest', label: 'الأحدث أولاً' },
  { value: 'oldest', label: 'الأقدم أولاً' },
  { value: 'alphabetical', label: 'أبجدياً' },
  { value: 'dueSoonest', label: 'الأقرب موعداً' },
]

function isSortValue(value: string): value is GlossarySort {
  return SORT_OPTIONS.some((option) => option.value === value)
}

interface GlossaryFilterBarProps {
  filters: GlossaryFilters
  onChange: (next: GlossaryFilters) => void
  /** The video filter only makes sense while a video is open */
  canFilterByVideo: boolean
  visibleCount: number
  totalCount: number
}

/** Search box, status chips and sort order for the vocabulary list */
export function GlossaryFilterBar({ filters, onChange, canFilterByVideo, visibleCount, totalCount }: GlossaryFilterBarProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative">
        <label htmlFor="glossary-search" className="sr-only">
          بحث في المفردات
        </label>
        <Search
          size={15}
          className="pointer-events-none absolute inset-s-3 top-1/2 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <input
          id="glossary-search"
          type="search"
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          placeholder="ابحث بالكلمة أو معناها أو جملتها…"
          className="w-full rounded-md border border-border bg-surface-elevated py-2 ps-9 pe-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console"
        />
      </div>

      <div role="group" aria-label="تصفية حسب الحالة" className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map(({ value, label }) => {
          const isActive = filters.status === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange({ ...filters, status: value })}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console',
                isActive
                  ? 'border-console bg-console/15 text-console'
                  : 'border-border text-text-secondary hover:border-console/50 hover:text-text-primary',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      <Select
        id="glossary-sort"
        label="الترتيب"
        value={filters.sort}
        onChange={(event) => {
          const next = event.target.value
          if (isSortValue(next)) onChange({ ...filters, sort: next })
        }}
        className="text-sm"
      >
        {SORT_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      {canFilterByVideo && (
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={filters.onlyThisVideo}
            onChange={(event) => onChange({ ...filters, onlyThisVideo: event.target.checked })}
            className="h-4 w-4 accent-console"
          />
          من هذا الفيديو فقط
        </label>
      )}

      <p data-testid="glossary-count" className="text-xs text-text-muted">
        عرض <span dir="ltr">{visibleCount}</span> من <span dir="ltr">{totalCount}</span>
      </p>
    </div>
  )
}
