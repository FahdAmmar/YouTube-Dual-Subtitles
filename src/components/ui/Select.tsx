import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

/**
 * نستخدم عنصر <select> الأصلي (وليس قائمة منسدلة مبنية من <div>) عمداً:
 * العنصر الأصلي يدعم لوحة المفاتيح، قارئات الشاشة، والتشغيل على الجوال
 * بشكل مثالي دون أي كود إضافي — وهذا يحقق متطلب إتاحة الوصول (WCAG)
 * "مجاناً" بدل إعادة بناء هذا السلوك يدوياً وبشكل أقل موثوقية
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, id, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={cn(
              'w-full appearance-none rounded-md border border-border bg-surface-elevated',
              'py-2.5 ps-3 pe-9 text-[15px] text-text-primary',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console',
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
        </div>
      </div>
    )
  },
)

Select.displayName = 'Select'
