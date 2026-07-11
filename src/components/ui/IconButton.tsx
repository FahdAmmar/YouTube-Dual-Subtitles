import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** إلزامي: الأزرار المكوّنة من أيقونة فقط تحتاج نصاً بديلاً لقارئات الشاشة */
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-md',
          'text-text-secondary transition-colors duration-150',
          'hover:bg-surface-elevated hover:text-text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console',
          className,
        )}
        {...props}
      />
    )
  },
)

IconButton.displayName = 'IconButton'
