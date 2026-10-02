const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60

/** Compact Arabic duration for dashboards: "أقل من دقيقة", "12 د", "1 س 15 د" */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds > 0 && totalSeconds < SECONDS_PER_MINUTE) return 'أقل من دقيقة'

  const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  const minutes = totalMinutes % MINUTES_PER_HOUR

  if (hours === 0) return `${minutes} د`
  return minutes === 0 ? `${hours} س` : `${hours} س ${minutes} د`
}
