/**
 * أدوات تحويل ألوان صغيرة — لا حاجة لمكتبة كاملة لهذا القدر المحدود من
 * الحساب (Hex → RGB → HSL والعكس)، ويُبقي حزمة التطبيق خفيفة كما هي عادة
 * هذا المشروع (Framer Motion وlucide-react فقط بين الاعتماديات الفعلية)
 */

interface RGB {
  r: number
  g: number
  b: number
}

interface HSL {
  h: number
  s: number
  l: number
}

/** يحوّل "#RRGGBB" أو "#RGB" إلى قناة RGB منفصلة؛ يُرجع null لو الصيغة غير صالحة */
export function hexToRgb(hex: string): RGB | null {
  const normalized = hex.trim().replace(/^#/, '')
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  }
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255
  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const l = (max + min) / 2

  if (max === min) return { h: 0, s: 0, l: l * 100 }

  const delta = max - min
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)

  let h: number
  switch (max) {
    case rNorm:
      h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) * 60
      break
    case gNorm:
      h = ((bNorm - rNorm) / delta + 2) * 60
      break
    default:
      h = ((rNorm - gNorm) / delta + 4) * 60
  }

  return { h, s: s * 100, l: l * 100 }
}

function hslToRgb({ h, s, l }: HSL): RGB {
  const sNorm = s / 100
  const lNorm = l / 100

  if (sNorm === 0) {
    const gray = Math.round(lNorm * 255)
    return { r: gray, g: gray, b: gray }
  }

  const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm
  const p = 2 * lNorm - q

  function hueToRgb(t: number): number {
    let tNorm = t
    if (tNorm < 0) tNorm += 1
    if (tNorm > 1) tNorm -= 1
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm
    if (tNorm < 1 / 2) return q
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6
    return p
  }

  const hNorm = h / 360
  return {
    r: Math.round(hueToRgb(hNorm + 1 / 3) * 255),
    g: Math.round(hueToRgb(hNorm) * 255),
    b: Math.round(hueToRgb(hNorm - 1 / 3) * 255),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** "R G B" مفصولة بمسافات — الصيغة التي يتوقعها Tailwind لتمكين <alpha-value> (انظر index.css) */
function rgbToChannelString({ r, g, b }: RGB): string {
  return `${r} ${g} ${b}`
}

export interface AccentPair {
  base: string
  hover: string
}

/**
 * يشتق زوج ألوان تمييز (أساسي + hover) آمنَين للاستخدام كلون نظام كامل
 * (حلقات التركيز، الأزرار، توهج المقطع النشط...) من أي لون يختاره
 * المستخدم بحرية لنص الترجمة (مسار B) عبر <input type="color">.
 *
 * لماذا الاشتقاق ضروري وليس استخدام اللون كما هو مباشرة: لون نص الترجمة
 * مُصمَّم ليكون مقروءاً فوق خلفية فيديو داكنة فقط (خلف طبقة bg-black/70)،
 * بينما لون النظام يُستخدم في سياقات أوسع بكثير (نص صغير، حدود حلقات
 * تركيز، خلفيات أزرار) فوق خلفيات فاتحة وداكنة معاً. لون فاتح جداً مثل
 * الأبيض تقريباً، أو داكن جداً، أو منزوع التشبع تماماً (رمادي) قد يكون
 * ممتازاً كنص ترجمة لكنه يصبح غير مقروء تقريباً كلون تمييز للواجهة. لذا:
 * - التشبع (Saturation) يُرفَع لحد أدنى (45%) كي لا يتحوّل اللون لرمادي باهت
 * - الإضاءة (Lightness) تُحصر ضمن نطاق مختلف لكل سمة: أفتح قليلاً في
 *   الوضع الداكن (ليبرز فوق خلفية شبه سوداء)، أغمق قليلاً في الوضع الفاتح
 *   (ليتباين مع خلفية شبه بيضاء) — يطابق تماماً الفرق الملحوظ فعلياً بين
 *   قيمتَي --color-console الافتراضيتين في index.css لكلا الوضعين
 * درجة اللون (Hue) نفسها تبقى بلا أي تعديل — فيظل التمييز البصري الرابط
 * بين "لون الفيديو الأجنبي" و"لون واجهة التطبيق" واضحاً وصادقاً
 */
export function deriveAccentPair(hex: string, theme: 'light' | 'dark'): AccentPair | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null

  const hsl = rgbToHsl(rgb)
  const safeSaturation = clamp(hsl.s, 45, 100)

  const [baseLightness, hoverLightness] =
    theme === 'dark' ? [clamp(hsl.l, 58, 74), clamp(hsl.l + 9, 58, 82)] : [clamp(hsl.l, 42, 60), clamp(hsl.l - 9, 30, 60)]

  const base = hslToRgb({ h: hsl.h, s: safeSaturation, l: baseLightness })
  const hover = hslToRgb({ h: hsl.h, s: safeSaturation, l: hoverLightness })

  return {
    base: rgbToChannelString(base),
    hover: rgbToChannelString(hover),
  }
}
