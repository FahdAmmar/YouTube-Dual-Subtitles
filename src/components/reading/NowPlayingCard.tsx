import { AudioLines } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface NowPlayingCardProps {
  title: string
  isPlaying: boolean
  className?: string
}

const BAR_DELAYS_MS = [0, 180, 360, 90, 270]

/** Stands in for the video when a local file is played as audio only */
export function NowPlayingCard({ title, isPlaying, className }: NowPlayingCardProps) {
  return (
    <div
      className={cn(
        'flex aspect-video flex-col items-center justify-center gap-4 rounded-xl border border-border bg-surface-elevated px-6 text-center shadow-elevated',
        className,
      )}
    >
      <div className="flex h-10 items-end gap-1.5" aria-hidden="true">
        {BAR_DELAYS_MS.map((delay, index) => (
          <span
            key={index}
            className={cn(
              'w-1.5 rounded-full bg-console',
              isPlaying ? 'h-full origin-bottom animate-pulse-dot motion-reduce:animate-none' : 'h-2',
            )}
            style={isPlaying ? { animationDelay: `${delay}ms`, height: `${40 + ((index * 17) % 60)}%` } : undefined}
          />
        ))}
      </div>
      <p className="line-clamp-2 max-w-full text-sm font-medium text-text-primary" dir="auto">
        {title}
      </p>
      <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-text-secondary">
        <AudioLines size={12} aria-hidden="true" />
        صوت فقط
      </p>
    </div>
  )
}
