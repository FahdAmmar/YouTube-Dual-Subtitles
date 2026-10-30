import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Knows the names this project adds to Tailwind (src/index.css), so that e.g. `shadow-soft` and
 * `shadow-elevated` are seen as two shadows rather than a shadow and an unknown colour.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      shadow: ['soft', 'elevated', 'glow-console'],
      radius: ['sm', 'md', 'lg', 'xl'],
    },
  },
})

/**
 * Joins class names conditionally (clsx) and resolves conflicts between them: when a component's default
 * `h-10` meets a caller's `h-8`, the last one wins. Without this the winner is whichever rule Tailwind happens
 * to emit last in the stylesheet, which changed between Tailwind 3 and 4 and is not something to rely on.
 * Example: cn('btn', isActive && 'btn-active', disabled && 'opacity-50')
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
