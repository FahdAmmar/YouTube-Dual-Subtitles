import { describe, it, expect } from 'vitest'
import { hexToRgb, deriveAccentPair } from './color'

describe('hexToRgb', () => {
  it('parses a standard 6-digit hex color', () => {
    expect(hexToRgb('#4FC7BE')).toEqual({ r: 79, g: 199, b: 190 })
  })

  it('parses a 3-digit shorthand hex color', () => {
    expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 })
  })

  it('accepts a hex value without the leading #', () => {
    expect(hexToRgb('4FC7BE')).toEqual({ r: 79, g: 199, b: 190 })
  })

  it('returns null for an invalid value', () => {
    expect(hexToRgb('not-a-color')).toBeNull()
    expect(hexToRgb('#12345')).toBeNull()
    expect(hexToRgb('')).toBeNull()
  })
})

describe('deriveAccentPair', () => {
  it('returns null for an invalid hex color', () => {
    expect(deriveAccentPair('nonsense', 'dark')).toBeNull()
  })

  it('keeps the base and hover channel strings in valid "R G B" format', () => {
    const pair = deriveAccentPair('#4FC7BE', 'dark')
    expect(pair).not.toBeNull()
    expect(pair?.base).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/)
    expect(pair?.hover).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/)
  })

  // اللون نفسه يجب أن يُترجم لإضاءة مختلفة حسب السمة — أفتح في الوضع
  // الداكن (ليبرز فوق خلفية شبه سوداء)، أغمق في الوضع الفاتح (ليتباين مع
  // خلفية شبه بيضاء) — هذا هو جوهر أمان التباين الذي يوفّره الاشتقاق
  it('derives a lighter accent for dark theme than for light theme from the same input color', () => {
    const darkPair = deriveAccentPair('#4FC7BE', 'dark')
    const lightPair = deriveAccentPair('#4FC7BE', 'light')
    expect(darkPair).not.toBeNull()
    expect(lightPair).not.toBeNull()

    const darkLightness = hexToRgb(`#${toHex(darkPair!.base)}`)
    const lightLightness = hexToRgb(`#${toHex(lightPair!.base)}`)
    // مجموع القنوات كتقريب بسيط وكافٍ هنا لمقارنة "الإضاءة الكلية" النسبية
    const darkSum = darkLightness!.r + darkLightness!.g + darkLightness!.b
    const lightSum = lightLightness!.r + lightLightness!.g + lightLightness!.b
    expect(darkSum).toBeGreaterThan(lightSum)
  })

  it('clamps a near-white, near-gray color up to a legible minimum saturation/contrast instead of passing it through unchanged', () => {
    // لون شبه أبيض ومنزوع تشبع تقريباً — لو استُخدم كما هو كلون تمييز
    // للواجهة (حلقات تركيز، أزرار) سيكون غير مقروء تقريباً
    const pair = deriveAccentPair('#FDFDFD', 'dark')
    expect(pair).not.toBeNull()
    expect(pair?.base).not.toBe('253 253 253')
  })

  it('produces a hover variant distinct from the base color', () => {
    const pair = deriveAccentPair('#4FC7BE', 'dark')
    expect(pair?.base).not.toBe(pair?.hover)
  })
})

/** يحوّل سلسلة "R G B" المُعادة من deriveAccentPair إلى صيغة hex مطابقة لما يقبله hexToRgb، لإعادة استخدامه في مقارنة الإضاءة أعلاه */
function toHex(channelString: string): string {
  return channelString
    .split(' ')
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')
}
