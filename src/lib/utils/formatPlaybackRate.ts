/** تنسيق سرعة التشغيل لعرضها بإيجاز (1 → "1×"، 1.5 → "1.5×") دون أصفار زائدة بعد الفاصلة */
export function formatPlaybackRate(rate: number): string {
  return `${rate.toFixed(2).replace(/\.?0+$/, '')}×`
}
