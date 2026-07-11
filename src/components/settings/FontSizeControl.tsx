import { Slider } from '@/components/ui/Slider'
import { ColorPicker } from '@/components/ui/ColorPicker'
import type { SubtitleStyleSettings } from '@/types/theme.types'

interface TrackStyleControlProps {
  trackTitle: string
  accentClassName: string
  style: SubtitleStyleSettings
  onChange: (patch: Partial<SubtitleStyleSettings>) => void
}

const MIN_FONT_SIZE = 14
const MAX_FONT_SIZE = 40

/**
 * مجموعة عناصر تحكم كاملة (حجم + لون) لمسار ترجمة واحد
 * تُستخدم مرتين داخل SettingsPanel، مرة لكل مسار — بدل تكرار نفس عناصر
 * Slider و ColorPicker يدوياً في كل مكان (مبدأ DRY / Composition)
 */
export function TrackStyleControl({
  trackTitle,
  accentClassName,
  style,
  onChange,
}: TrackStyleControlProps) {
  const fontSizeId = `font-size-${trackTitle}`
  const colorId = `font-color-${trackTitle}`

  return (
    <div className={`flex flex-col gap-4 border-s-4 ps-4 ${accentClassName}`}>
      <h3 className="text-sm font-semibold text-text-primary">{trackTitle}</h3>

      <Slider
        id={fontSizeId}
        label="حجم الخط"
        valueLabel={`${style.fontSize}px`}
        min={MIN_FONT_SIZE}
        max={MAX_FONT_SIZE}
        step={1}
        value={style.fontSize}
        onChange={(event) => onChange({ fontSize: Number(event.target.value) })}
      />

      <ColorPicker
        id={colorId}
        label="لون النص"
        value={style.color}
        onChange={(color) => onChange({ color })}
      />
    </div>
  )
}
