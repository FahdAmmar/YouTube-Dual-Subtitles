import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-console text-white hover:bg-console-hover shadow-soft',
  secondary:
    'bg-surface-elevated text-text-primary border border-border hover:bg-border/40',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-[15px] gap-2',
}

/**
 * مكوّن الزر الأساسي في نظام التصميم — كل الأزرار في التطبيق تمر من هنا
 * لضمان اتساق المظهر والسلوك (التركيز عبر لوحة المفاتيح، حالة التعطيل...)
 * بدل تكرار أنماط Tailwind في كل مكان يحتاج زراً (مبدأ DRY)
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          'disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none',
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
