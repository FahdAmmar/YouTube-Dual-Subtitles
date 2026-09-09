// Intl.RelativeTimeFormat يتولى قواعد الجمع/المثنى العربية المعقدة تلقائياً
// ("قبل يوم" مفرد، "قبل يومين" مثنى، "قبل 3 أيام" جمع) — لا حاجة لإعادة
// تنفيذها يدوياً، ولا لأي مكتبة خارجية
const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })

const UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 31536000 },
  { unit: 'month', seconds: 2592000 },
  { unit: 'week', seconds: 604800 },
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
]

/** يحوّل طابعاً زمنياً ماضياً (مثال: Date.now() محفوظ سابقاً) إلى نص نسبي بالعربية، مثال: "قبل 3 أيام" */
export function formatRelativeTime(timestamp: number): string {
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000)
  const absSeconds = Math.abs(diffSeconds)

  if (absSeconds < 60) return 'الآن'

  for (const { unit, seconds } of UNITS) {
    if (absSeconds >= seconds) {
      return RELATIVE_TIME_FORMATTER.format(Math.round(diffSeconds / seconds), unit)
    }
  }
  return 'الآن'
}
