import type { ReactNode } from 'react'
import { AArrowDown, AArrowUp, ArrowUpDown, Clock, Eye, EyeOff, Repeat1, Search, Settings2, X } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { ViewModeToggle } from '@/components/console/ViewModeToggle'
import { CopyMenu } from './CopyMenu'
import { cn } from '@/lib/utils/cn'
import { READING_FONT_SCALES, type ReadingPrefs } from '@/lib/utils/readingPrefs'
import type { CopyScope } from '@/lib/subtitles/formatTranscript'
import type { ViewMode } from '@/types/theme.types'

interface ReadingToolsProps {
  className?: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  sourceLanguageCode: string
  translationLanguageCode: string
  prefs: ReadingPrefs
  onPrefsChange: (patch: Partial<ReadingPrefs>) => void
  isLooping: boolean
  onToggleLoop: () => void
  onCopyAll: (scope: CopyScope) => void
  onOpenSettings: () => void
  /** Only local files can be listened to without showing the video */
  canHideVideo: boolean
  isVideoHidden: boolean
  onToggleVideoHidden: () => void
  query: string
  onQueryChange: (query: string) => void
  /** Lines matching the query; shown only while searching */
  resultCount: number
}

interface ToolButtonProps {
  label: string
  onClick: () => void
  isPressed?: boolean
  disabled?: boolean
  children: ReactNode
}

function ToolButton({ label, onClick, isPressed, disabled, children }: ToolButtonProps) {
  return (
    <IconButton
      aria-label={label}
      title={label}
      aria-pressed={isPressed}
      disabled={disabled}
      onClick={onClick}
      className={cn('h-9 w-9', isPressed && 'bg-console/15 text-console hover:bg-console/20 hover:text-console')}
    >
      {children}
    </IconButton>
  )
}

export function ReadingTools(props: ReadingToolsProps) {
  const { prefs, onPrefsChange } = props
  const lastScaleIndex = READING_FONT_SCALES.length - 1

  return (
    <div className={cn('flex flex-col gap-3', props.className)}>
      <div className="relative">
        <Search size={14} aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="search"
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') props.onQueryChange('')
          }}
          placeholder="ابحث في النص..."
          aria-label="بحث في النص"
          className="w-full rounded-md border border-border bg-surface-elevated py-2 ps-9 pe-9 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console [&::-webkit-search-cancel-button]:hidden"
        />
        {props.query && (
          <button
            type="button"
            aria-label="مسح البحث"
            onClick={() => props.onQueryChange('')}
            className="absolute end-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
        {props.query.trim() && (
          <p role="status" className="mt-1.5 text-[11px] text-text-secondary">
            {props.resultCount === 0 ? 'لا توجد نتائج' : `${props.resultCount} ${props.resultCount === 1 ? 'نتيجة' : 'نتائج'}`}
          </p>
        )}
      </div>

      <ViewModeToggle
        value={props.viewMode}
        onChange={props.onViewModeChange}
        sourceLanguageCode={props.sourceLanguageCode}
        translationLanguageCode={props.translationLanguageCode}
      />

      <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="أدوات القراءة">
        <ToolButton
          label="تصغير الخط"
          disabled={prefs.fontScaleIndex === 0}
          onClick={() => onPrefsChange({ fontScaleIndex: Math.max(prefs.fontScaleIndex - 1, 0) })}
        >
          <AArrowDown size={18} aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="تكبير الخط"
          disabled={prefs.fontScaleIndex === lastScaleIndex}
          onClick={() => onPrefsChange({ fontScaleIndex: Math.min(prefs.fontScaleIndex + 1, lastScaleIndex) })}
        >
          <AArrowUp size={18} aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="تبديل ترتيب اللغتين"
          isPressed={prefs.isSwapped}
          onClick={() => onPrefsChange({ isSwapped: !prefs.isSwapped })}
        >
          <ArrowUpDown size={16} aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="إظهار الأزمنة"
          isPressed={prefs.showTimestamps}
          onClick={() => onPrefsChange({ showTimestamps: !prefs.showTimestamps })}
        >
          <Clock size={16} aria-hidden="true" />
        </ToolButton>
        <ToolButton label="تكرار الجملة الحالية" isPressed={props.isLooping} onClick={props.onToggleLoop}>
          <Repeat1 size={17} aria-hidden="true" />
        </ToolButton>
        <CopyMenu onCopy={props.onCopyAll} />
        <ToolButton label="إعدادات حجم ولون الترجمة" onClick={props.onOpenSettings}>
          <Settings2 size={16} aria-hidden="true" />
        </ToolButton>
        {props.canHideVideo && (
          <ToolButton
            label={props.isVideoHidden ? 'إظهار الفيديو' : 'إخفاء الفيديو (صوت فقط)'}
            isPressed={props.isVideoHidden}
            onClick={props.onToggleVideoHidden}
          >
            {props.isVideoHidden ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </ToolButton>
        )}
      </div>
    </div>
  )
}
