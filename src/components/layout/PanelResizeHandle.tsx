import { ChevronsLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface PanelResizeHandleProps {
  width: number
  minWidth: number
  maxWidth: number
  isDragging: boolean
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
  onDoubleClick: () => void
  /** أصناف إضافية اختيارية (مثال: lg:order-* من AppShell عند تبديل موضع اللوحة الجانبية) */
  className?: string
}

/**
 * مقبض تغيير حجم اللوحة الجانبية — يظهر فقط على الشاشات الكبيرة (lg+) حيث
 * يكون التخطيط عمودين جنباً إلى جنب. يستخدم منطقة نقر أوسع (شفافة) من
 * الخط المرئي نفسه لضمان هدف لمس/نقر مريح (متطلب WCAG لحجم هدف اللمس)
 * دون أن يبدو المقبض سميكاً بصرياً في الحالة العادية.
 *
 * عند المرور بالفأرة أو التركيز أو السحب: يظهر خط اللون المميز مع أيقونة
 * سهم أفقي (↔) في المنتصف — تماماً الإشارة المطلوبة لإفهام المستخدم أن
 * هذا العنصر قابل للسحب لتغيير عرض اللوحة الجانبية (وبالتبعية عرض الفيديو)
 */
export function PanelResizeHandle({
  width,
  minWidth,
  maxWidth,
  isDragging,
  onPointerDown,
  onKeyDown,
  onDoubleClick,
  className,
}: PanelResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="تغيير عرض اللوحة الجانبية بالسحب أو بمفتاحي السهم"
      aria-valuenow={Math.round(width)}
      aria-valuemin={minWidth}
      aria-valuemax={Math.round(maxWidth)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onDoubleClick}
      className={cn(
        'group relative hidden w-2 shrink-0 cursor-col-resize touch-none select-none items-stretch justify-center outline-none lg:flex',
        className,
      )}
    >
      <div
        className={cn(
          'w-px shrink-0 bg-border transition-colors duration-150',
          'group-hover:bg-console group-focus-visible:bg-console',
          isDragging && 'bg-console',
        )}
        aria-hidden="true"
      />

      <div
        className={cn(
          'pointer-events-none absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text-muted opacity-0 shadow-soft transition-opacity duration-150',
          'group-hover:opacity-100 group-focus-visible:opacity-100',
          isDragging && 'opacity-100 border-console text-console',
        )}
        aria-hidden="true"
      >
        <ChevronsLeftRight size={13} />
      </div>
    </div>
  )
}
