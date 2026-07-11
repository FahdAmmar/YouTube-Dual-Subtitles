import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * مكوّن البطاقة: وحدة العرض الأساسية للأقسام في التطبيق (رفع الملفات،
 * الإعدادات، إلخ). يوحّد الحواف والظل والحدود بدل تكرارها في كل قسم.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface shadow-soft',
        className,
      )}
      {...props}
    />
  )
}
