import { Minus, Plus, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SyncOffsetControlProps {
  /** اسم اللغة المعروض بجانب أزرار التحكم — اختياري لدعم الاستخدام المضغوط حيث السياق واضح أصلاً من مكان العرض */
  languageLabel?: string
  offsetSeconds: number
  accentClassName?: string
  onNudge: (direction: 1 | -1) => void
  onReset: () => void
}

/** تنسيق الإزاحة كنص مقروء بالعربية، مع إشارة +/- واضحة (مثال: "+0.5ث") */
function formatOffset(seconds: number): string {
  if (seconds === 0) return '0.0ث'
  const sign = seconds > 0 ? '+' : '−'
  return `${sign}${Math.abs(seconds).toFixed(2).replace(/0$/, '')}ث`
}

/**
 * تحكم مصغّر لتصحيح عدم تطابق توقيت ملف الترجمة مع نسخة الفيديو —
 * مشكلة شائعة جداً عند استخدام ملفات SRT/VTT من مصادر مختلفة عن الفيديو
 * نفسه. الإزاحة الموجبة تؤخّر ظهور الترجمة، والسالبة تُقدّمها.
 * حلقة التركيز (focus ring) تستخدم عمداً لون console الموحّد (وليس لون
 * المسار) لأنها عنصر تفاعل نظامي، بينما تبقى ألوان المسارين مخصصة للمحتوى فقط
 */
export function SyncOffsetControl({
  languageLabel,
  offsetSeconds,
  accentClassName,
  onNudge,
  onReset,
}: SyncOffsetControlProps) {
  const accessibleLabel = languageLabel ?? 'هذا المسار'

  return (
    <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
      {languageLabel && <span className={cn('font-medium', accentClassName)}>{languageLabel}</span>}

      <button
        type="button"
        onClick={() => onNudge(-1)}
        aria-label={`تقديم ترجمة ${accessibleLabel} ربع ثانية`}
        className="flex h-7 w-7 items-center justify-center rounded-sm hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
      >
        <Minus size={12} aria-hidden="true" />
      </button>

      <span className="w-11 text-center font-mono tabular-nums" aria-live="polite">
        {formatOffset(offsetSeconds)}
      </span>

      <button
        type="button"
        onClick={() => onNudge(1)}
        aria-label={`تأخير ترجمة ${accessibleLabel} ربع ثانية`}
        className="flex h-7 w-7 items-center justify-center rounded-sm hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
      >
        <Plus size={12} aria-hidden="true" />
      </button>

      {offsetSeconds !== 0 && (
        <button
          type="button"
          onClick={onReset}
          aria-label={`إعادة ضبط إزاحة ترجمة ${accessibleLabel}`}
          className="flex h-7 w-7 items-center justify-center rounded-sm hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
        >
          <RotateCcw size={11} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
