import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

interface VideoTopBarProps {
  languageCode: string
  onBack: () => void
  /** Rendered next to the language badge (subtitle quick controls) */
  trailingControls?: ReactNode
}

/**
 * شريط علوي شفاف مُطبَّق فوق الفيديو — يعرض زر عودة لتغيير الفيديو الحالي
 * وشارة صغيرة برمز لغة المصدر (مثال: "AR"، "EN") بطراز الكونسول التقني
 */
export function VideoTopBar({ languageCode, onBack, trailingControls }: VideoTopBarProps) {
  return (
    // Overlay on the video (was in normal flow, so it was pushed out of the stage and clipped). The empty gradient
    // stays pointer-events-none so taps still reach the gesture layer underneath.
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-3 pb-6 pt-3">
      <button
        type="button"
        onClick={onBack}
        className="pointer-events-auto flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-[11px] tracking-wide text-white/70 transition-colors hover:text-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
      >
        <ChevronRight size={13} aria-hidden="true" />
        [ CHANGE_VIDEO ]
      </button>

      <div className="pointer-events-auto flex items-center gap-1.5">
        {trailingControls}
        <span className="rounded-sm border border-white/20 bg-black/40 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-white/80">
          {languageCode}
        </span>
      </div>
    </div>
  )
}
