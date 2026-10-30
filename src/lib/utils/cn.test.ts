import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins classes and skips falsy values, as clsx does', () => {
    expect(cn('a', undefined, null, '', 0, ['c', { d: true, e: false }])).toBe('a c d')
  })

  it('lets the caller override a default of the same kind, whatever the numbers say', () => {
    // Tailwind 3 happened to sort these so the caller won; Tailwind 4 sorts by value, so the string must decide
    expect(cn('h-10 w-10', 'h-8 w-8')).toBe('h-8 w-8')
    expect(cn('h-11', 'h-12')).toBe('h-12')
    expect(cn('py-2.5', 'py-2')).toBe('py-2')
  })

  it('lets a caller hide a default-visible element', () => {
    expect(cn('inline-flex items-center', 'hidden lg:inline-flex')).toBe('items-center hidden lg:inline-flex')
  })

  it('lets a caller change the corner radius', () => {
    expect(cn('rounded-md', 'rounded-full')).toBe('rounded-full')
  })

  it('keeps a base class and its responsive variant apart', () => {
    expect(cn('p-2', 'lg:p-4')).toBe('p-2 lg:p-4')
    expect(cn('hidden', 'lg:flex')).toBe('hidden lg:flex')
  })

  it('knows the design-system colours: the last text colour wins, a font size is untouched', () => {
    expect(cn('text-text-secondary', 'text-text-primary')).toBe('text-text-primary')
    expect(cn('text-sm text-text-muted', 'text-text-primary')).toBe('text-sm text-text-primary')
    expect(cn('text-text-muted', 'text-sm')).toBe('text-text-muted text-sm')
  })

  it('knows the design-system shadows and radii', () => {
    expect(cn('shadow-soft', 'shadow-elevated')).toBe('shadow-elevated')
    expect(cn('rounded-sm', 'rounded-xl')).toBe('rounded-xl')
  })

  it('does not merge a ring width with a ring colour', () => {
    expect(cn('ring-2 ring-console', 'ring-red-500')).toBe('ring-2 ring-red-500')
  })
})
