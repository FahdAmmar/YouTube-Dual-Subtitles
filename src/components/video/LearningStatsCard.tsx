import { useMemo, type ReactNode } from 'react'
import { Flame, Clock, BookMarked, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatDuration } from '@/lib/utils/formatDuration'
import { getLearningSummary, CHART_DAYS } from '@/lib/utils/learningSummary'

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('ar', { weekday: 'short' })

interface StatTileProps {
  testId: string
  icon: ReactNode
  value: string
  label: string
}

function StatTile({ testId, icon, value, label }: StatTileProps) {
  return (
    <div data-testid={testId} className="flex flex-col items-center gap-1 rounded-md bg-surface-elevated px-2 py-3 text-center">
      <span className="text-console" aria-hidden="true">{icon}</span>
      <span className="font-mono text-lg font-semibold tabular-nums text-text-primary">{value}</span>
      <span className="text-[11px] text-text-muted">{label}</span>
    </div>
  )
}

/**
 * ملخص تعلّم محلي بالكامل: سلسلة الأيام المتتالية، وقت المشاهدة هذا الأسبوع،
 * والكلمات والجمل المحفوظة. لا يظهر لمن لم يبدأ بعد حتى لا تُزدحم الشاشة الرئيسية
 */
export function LearningStatsCard() {
  // Read once per visit: the home screen never changes the data it shows
  const summary = useMemo(() => getLearningSummary(), [])
  if (!summary.hasData) return null

  const longestDay = Math.max(...summary.days.map((day) => day.seconds), 1)
  const chartLabel = `مدة المشاهدة خلال آخر ${CHART_DAYS} أيام: ${summary.days
    .map((day) => `${WEEKDAY_FORMATTER.format(day.date)} ${formatDuration(day.seconds)}`)
    .join('، ')}`

  return (
    <Card className="mt-6 p-4">
      <h2 className="mb-3 font-mono text-[11px] tracking-widest text-text-muted">LEARNING_STATS</h2>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile testId="stat-streak" icon={<Flame size={16} />} value={String(summary.streak)} label="أيام متتالية" />
        <StatTile testId="stat-week" icon={<Clock size={16} />} value={formatDuration(summary.weekSeconds)} label="هذا الأسبوع" />
        <StatTile testId="stat-words" icon={<BookMarked size={16} />} value={String(summary.wordCount)} label="كلمات محفوظة" />
        <StatTile testId="stat-bookmarks" icon={<Star size={16} />} value={String(summary.bookmarkCount)} label="جمل مفضلة" />
      </div>

      <div role="img" aria-label={chartLabel} className="mt-4 flex h-20 items-end gap-1.5">
        {summary.days.map((day) => (
          <div key={day.dayKey} className="flex h-full flex-1 flex-col items-center justify-end gap-1" aria-hidden="true">
            <div
              className={day.seconds > 0 ? 'w-full rounded-sm bg-console' : 'w-full rounded-sm bg-border'}
              style={{ height: day.seconds > 0 ? `${Math.max((day.seconds / longestDay) * 100, 8)}%` : '4px' }}
            />
            <span className="text-[10px] text-text-muted">{WEEKDAY_FORMATTER.format(day.date)}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
