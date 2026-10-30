import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/utils/cn'

export interface OverflowMenuItem {
  key: string
  label: string
  icon?: ReactNode
  onSelect: () => void
  /** Extra classes for the item, e.g. `max-lg:hidden` for an action that only exists on large screens */
  className?: string
}

interface OverflowMenuProps {
  /** Accessible name of the trigger and of the menu */
  label: string
  items: OverflowMenuItem[]
  className?: string
}

/**
 * A "more actions" menu for the rarely used controls of a crowded toolbar. Opens with a click or Enter, moves with
 * the arrow keys, closes with Escape or a click outside, and always returns focus to the trigger so a keyboard user
 * never loses their place (also when the chosen action opens a dialog, which then returns focus to the trigger).
 */
export function OverflowMenu({ label, items, className }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDownOutside(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDownOutside)
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside)
  }, [isOpen])

  // Move focus into the menu when it opens, so the arrow keys work straight away
  useEffect(() => {
    if (!isOpen) return
    containerRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([hidden])')?.focus()
  }, [isOpen])

  function closeAndRestoreFocus() {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      closeAndRestoreFocus()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const menuItems = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(
      (element) => getComputedStyle(element).display !== 'none',
    )
    if (menuItems.length === 0) return
    const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    menuItems[(currentIndex + step + menuItems.length) % menuItems.length]?.focus()
  }

  function handleSelect(item: OverflowMenuItem) {
    closeAndRestoreFocus()
    item.onSelect()
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <IconButton
        ref={triggerRef}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((previous) => !previous)}
        className="h-8 w-8"
      >
        <MoreHorizontal size={15} aria-hidden="true" />
      </IconButton>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className="absolute inset-e-0 top-full z-20 mt-1 flex min-w-56 flex-col gap-0.5 rounded-md border border-border bg-surface-elevated p-1 shadow-elevated"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(item)}
              className={cn(
                'flex min-h-10 items-center gap-2 rounded-sm px-3 text-start text-sm text-text-primary transition-colors hover:bg-border/40 focus-visible:bg-border/40 focus-visible:outline-hidden',
                item.className,
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
