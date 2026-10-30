import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useWatchHistoryEntries } from '@/hooks/useWatchHistory'
import { STORAGE_KEYS } from '@/constants/theme.constants'
import { YT_DLP_COMMAND } from '@/constants/subtitleHelp'

const STEPS: readonly { title: string; body: string }[] = [
  {
    title: 'اختر الفيديو',
    body: 'الصق رابط يوتيوب أو Vimeo في الحقل أعلاه، أو افتح ملف فيديو من جهازك.',
  },
  {
    title: 'أضف ملف الترجمة',
    body: 'اسحب ملف ‎.srt أو ‎.vtt أو ‎.ass إلى الصفحة، أو الصق نص الترجمة. ارفع ملفاً لكل لغة، أو ملفاً واحداً ثنائي اللغة.',
  },
  {
    title: 'تعلّم من الكلمات',
    body: 'انقر أي كلمة في الترجمة لتعرف معناها، واحفظها في مفرداتك، ثم راجعها لاحقاً بالتكرار المتباعد.',
  },
]

/**
 * Home-screen help for a first visit. The app cannot fetch subtitles itself (it has no server), which is the
 * first thing a newcomer gets stuck on, so the guide says where to get a file. It stays hidden for anyone who
 * dismissed it or has already watched something, and a small button brings it back.
 */
export function OnboardingGuide() {
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(STORAGE_KEYS.ONBOARDING_DISMISSED, false)
  const [isReopened, setIsReopened] = useState(false)
  const { entries } = useWatchHistoryEntries()

  const isVisible = isReopened || (!isDismissed && entries.length === 0)

  function dismiss() {
    setIsDismissed(true)
    setIsReopened(false)
  }

  if (!isVisible) {
    return (
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => setIsReopened(true)}
          className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-text-secondary transition-colors hover:text-console focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console"
        >
          <BookOpen size={13} aria-hidden="true" />
          دليل البدء
        </button>
      </div>
    )
  }

  return (
    <Card className="mt-6 flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-bold text-text-primary">ابدأ في ثلاث خطوات</h2>
        <IconButton aria-label="إغلاق الدليل" onClick={dismiss}>
          <X size={17} aria-hidden="true" />
        </IconButton>
      </div>

      <ol className="flex flex-col gap-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-console/15 font-mono text-xs font-semibold text-console"
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-text-primary">{step.title}</p>
              <p className="text-sm leading-relaxed text-text-secondary">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <details className="rounded-md border border-border p-3 text-sm">
        <summary className="cursor-pointer font-medium text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-console">
          كيف أحصل على ملف الترجمة؟
        </summary>
        <div className="mt-3 flex flex-col gap-2 leading-relaxed text-text-secondary">
          <p>
            التطبيق لا يجلب الترجمات من يوتيوب بنفسه، وملفات الترجمة تبقى على جهازك ولا تُرفع إلى أي خادم.
          </p>
          <p>لفيديو يوتيوب: نزّل ترجمته بأداة مثل yt-dlp، مثلاً (غيّر اللغات إلى ما تحتاجه):</p>
          <code dir="ltr" className="block overflow-x-auto rounded-md bg-surface-elevated p-2 font-mono text-xs text-text-primary">
            {YT_DLP_COMMAND}
          </code>
          <p>لفيلم أو مسلسل: استخدم ملف الترجمة المرافق للفيديو، أو ملفاً ثنائي اللغة إن توفر.</p>
          <p>لا تملك ملفاً للغة الثانية؟ ارفع الأولى الآن وأضف الثانية متى توفرت.</p>
        </div>
      </details>

      <Button variant="secondary" size="sm" onClick={dismiss} className="w-fit">
        فهمت، أخفِ الدليل
      </Button>
    </Card>
  )
}
