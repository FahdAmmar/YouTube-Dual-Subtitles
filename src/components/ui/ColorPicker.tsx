import { cn } from '@/lib/utils/cn'

interface ColorPickerProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * مبني على <input type="color"> الأصلي: يوفّر منتقي ألوان متكامل من نظام
 * التشغيل مباشرة (يدعم إدخال قيمة Hex والاختيار البصري معاً) دون الحاجة
 * لبناء أو استيراد مكتبة منتقي ألوان كاملة لتطبيق لا يحتاج أكثر من هذا
 */
export function ColorPicker({ id, label, value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <label htmlFor={id} className="text-sm font-medium text-text-secondary">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="text-xs tabular-nums text-text-muted">{value.toUpperCase()}</span>
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-8 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
        />
      </div>
    </div>
  )
}
