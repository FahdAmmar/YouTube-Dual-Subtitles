import { cn } from '@/lib/utils/cn'
import type { ViewMode } from '@/types/theme.types'

interface ViewModeToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

const OPTIONS: { mode: ViewMode; label: string }[] = [
  { mode: 'source', label: 'SOURCE' },
  { mode: 'translation', label: 'TRANSLATION' },
  { mode: 'both', label: 'BOTH' },
]

/**
 * مجموعة أزرار قوسية بطراز الكونسول التقني للتبديل بين عرض المصدر فقط،
 * الترجمة فقط، أو كليهما معاً — تتحكم في كل من الترجمة المُطبَّقة فوق
 * الفيديو وقائمة النص المتزامن معاً من مكان واحد
 */
export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="وضع عرض الترجمة"
      className="flex flex-wrap gap-1.5"
    >
      {OPTIONS.map(({ mode, label }) => {
        const isActive = value === mode
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(mode)}
            className={cn(
              'rounded-sm border px-2.5 py-1.5 font-mono text-[11px] font-medium tracking-wide transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console',
              isActive
                ? 'border-console bg-console/10 text-console'
                : 'border-border text-text-muted hover:border-text-muted hover:text-text-secondary',
            )}
          >
            [ {label} ]
          </button>
        )
      })}
    </div>
  )
}
