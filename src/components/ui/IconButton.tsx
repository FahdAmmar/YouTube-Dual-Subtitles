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
          'text-text-secondary transition-[color,background-color,transform] duration-150',
          'hover:bg-surface-elevated hover:text-text-primary',
          // تغذية راجعة لمسية عند الضغط — انظر نفس الملاحظة في Button
          'active:scale-[0.94]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console',
          'disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100',
          className,
        )}
        {...props}
      />
    )
  },
)

IconButton.displayName = 'IconButton'
