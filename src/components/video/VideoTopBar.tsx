import { ChevronRight } from 'lucide-react'

interface VideoTopBarProps {
  languageCode: string
  onBack: () => void
}

/**
 * شريط علوي شفاف مُطبَّق فوق الفيديو — يعرض زر عودة لتغيير الفيديو الحالي
 * وشارة صغيرة برمز لغة المصدر (مثال: "AR"، "EN") بطراز الكونسول التقني
 */
export function VideoTopBar({ languageCode, onBack }: VideoTopBarProps) {
  return (
    <div className="flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-3 pb-6 pt-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-[11px] tracking-wide text-white/70 transition-colors hover:text-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
      >
        <ChevronRight size={13} aria-hidden="true" />
        [ CHANGE_VIDEO ]
      </button>

      <span className="rounded-sm border border-white/20 bg-black/40 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-white/80">
        {languageCode}
      </span>
    </div>
  )
}
