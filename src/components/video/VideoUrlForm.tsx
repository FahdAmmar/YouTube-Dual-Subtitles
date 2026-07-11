import { useState, type FormEvent } from 'react'
import { Play, AlertCircle } from 'lucide-react'
import { extractYouTubeVideoId } from '@/lib/youtube/extractVideoId'
import { Button } from '@/components/ui/Button'

interface VideoUrlFormProps {
  onVideoSelected: (videoId: string) => void
}

/**
 * نموذج إدخال رابط الفيديو. التحقق من صحة الرابط يتم بالكامل عبر
 * extractYouTubeVideoId قبل أي محاولة لبناء عنصر iframe، تطبيقاً لمبدأ
 * "لا تثق بأي مُدخل مستخدم" (OWASP Input Validation)
 */
export function VideoUrlForm({ onVideoSelected }: VideoUrlFormProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = extractYouTubeVideoId(inputValue)

    if (!result.success || !result.videoId) {
      setError(result.error ?? 'رابط غير صالح')
      return
    }

    setError(null)
    onVideoSelected(result.videoId)
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2.5">
      <label htmlFor="youtube-url" className="font-mono text-[11px] tracking-wide text-text-muted">
        VIDEO_URL
      </label>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          id="youtube-url"
          type="text"
          inputMode="url"
          dir="ltr"
          placeholder="https://www.youtube.com/watch?v=..."
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          className="h-12 flex-1 rounded-md border border-border bg-surface-elevated px-4 font-mono text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'youtube-url-error' : undefined}
        />
        <Button type="submit" size="md" className="h-12 shrink-0">
          <Play size={17} aria-hidden="true" />
          تشغيل
        </Button>
      </div>
      {error && (
        <p
          id="youtube-url-error"
          role="alert"
          className="flex items-center gap-1.5 text-sm text-error"
        >
          <AlertCircle size={15} aria-hidden="true" />
          {error}
        </p>
      )}
    </form>
  )
}
