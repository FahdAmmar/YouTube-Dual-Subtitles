import { useEffect, useRef, useState } from 'react'
import { Copy } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import type { CopyScope } from '@/lib/subtitles/formatTranscript'

interface CopyMenuProps {
  onCopy: (scope: CopyScope) => void
}

const OPTIONS: { scope: CopyScope; label: string }[] = [
  { scope: 'both', label: 'نسخ النص كاملاً (اللغتان)' },
  { scope: 'source', label: 'نسخ لغة الأصل فقط' },
  { scope: 'translation', label: 'نسخ الترجمة فقط' },
]

export function CopyMenu({ onCopy }: CopyMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <IconButton
        aria-label="نسخ النص"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
        className="h-9 w-9"
      >
        <Copy size={16} aria-hidden="true" />
      </IconButton>

      {isOpen && (
        <div
          role="menu"
          className="absolute end-0 top-full z-10 mt-1 w-56 rounded-md border border-border bg-surface-elevated p-1 shadow-elevated"
        >
          {OPTIONS.map(({ scope, label }) => (
            <button
              key={scope}
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
                onCopy(scope)
              }}
              className="block w-full rounded-sm px-3 py-2 text-start text-sm text-text-primary transition-colors hover:bg-border/40 focus-visible:bg-border/40 focus-visible:outline-none"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
