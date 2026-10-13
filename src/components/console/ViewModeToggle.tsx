import { cn } from '@/lib/utils/cn'
import { getLanguageByCode } from '@/constants/languages'
import type { ViewMode } from '@/types/theme.types'

interface ViewModeToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  /** Language codes of the two tracks; when given, the single-track options are named after the language */
  sourceLanguageCode?: string
  translationLanguageCode?: string
}

interface ModeOption {
  mode: ViewMode
  label: string
  /** Spoken name when the visible label is only a language code */
  ariaLabel?: string
}

function languageOption(mode: ViewMode, code: string | undefined, fallbackLabel: string): ModeOption {
  if (!code) return { mode, label: fallbackLabel }
  const name = getLanguageByCode(code)?.labelAr ?? code.toUpperCase()
  return { mode, label: code.toUpperCase(), ariaLabel: `عرض ${name} فقط` }
}

/**
 * Segmented control for what the subtitles show: one language only, both, or recall (source visible, translation
 * hidden until revealed). Drives both the on-video subtitles and the synced transcript list.
 */
export function ViewModeToggle({ value, onChange, sourceLanguageCode, translationLanguageCode }: ViewModeToggleProps) {
  const options: ModeOption[] = [
    languageOption('source', sourceLanguageCode, 'SOURCE'),
    languageOption('translation', translationLanguageCode, 'TRANSLATION'),
    { mode: 'both', label: 'BOTH' },
    { mode: 'recall', label: 'RECALL' },
  ]

  return (
    <div role="radiogroup" aria-label="وضع عرض الترجمة" className="flex flex-wrap gap-1.5">
      {options.map(({ mode, label, ariaLabel }) => {
        const isActive = value === mode
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={ariaLabel}
            onClick={() => onChange(mode)}
            className={cn(
              'rounded-sm border px-2.5 py-1.5 font-mono text-[11px] font-medium tracking-wide transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console',
              isActive
                ? 'border-console bg-console/10 text-text-primary'
                : 'border-border text-text-secondary hover:border-text-secondary hover:text-text-primary',
            )}
          >
            [ {label} ]
          </button>
        )
      })}
    </div>
  )
}
