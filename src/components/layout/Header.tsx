import { Terminal } from 'lucide-react'
import { ThemeToggle } from '@/components/settings/ThemeToggle'

/**
 * رأس صفحة مضغوط: الشعار والاسم فقط + مبدّل السمة. زر الإعدادات انتقل
 * إلى لوحة التحكم الجانبية (ConsolePanel) لأنه يخص الترجمة تحديداً، بينما
 * هذا الرأس عام لكامل التطبيق — فصل واضح بين إعدادات النطاق العام والخاص
 */
export function Header() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3.5 sm:px-5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-console text-white">
          <Terminal size={15} aria-hidden="true" />
        </span>
        <h1 className="font-mono text-[13px] font-medium tracking-wide text-text-primary">
          DUAL_SUB<span className="text-console">.</span>
        </h1>
      </div>

      <ThemeToggle />
    </header>
  )
}
