/** تنسيق عدد بايتات إلى نص مقروء بأقرب وحدة مناسبة (بايت/كيلوبايت/ميغابايت) */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 بايت'
  if (bytes < 1024) return `${Math.round(bytes)} بايت`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} ك.ب`
  return `${(kb / 1024).toFixed(1)} م.ب`
}
