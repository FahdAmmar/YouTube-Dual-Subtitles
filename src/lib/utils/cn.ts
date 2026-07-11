import { clsx, type ClassValue } from 'clsx'

/**
 * غلاف رقيق حول clsx لدمج أصناف Tailwind بشكل مشروط وقابل للقراءة
 * مثال: cn('btn', isActive && 'btn-active', disabled && 'opacity-50')
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
