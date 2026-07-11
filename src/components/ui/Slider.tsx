import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  valueLabel: string
}

/**
 * شريط تمرير مبني على <input type="range"> الأصلي لضمان دعم لوحة المفاتيح
 * (أسهم يمين/يسار) والإتاحة الكاملة دون إعادة تطوير هذا السلوك يدوياً
 */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, valueLabel, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
          <span className="text-sm tabular-nums text-text-muted">{valueLabel}</span>
        </div>
        <input
          ref={ref}
          id={id}
          type="range"
          className={cn(
            'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-console',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
            className,
          )}
          {...props}
        />
      </div>
    )
  },
)

Slider.displayName = 'Slider'
