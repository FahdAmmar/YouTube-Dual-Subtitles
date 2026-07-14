import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Play, AlertCircle, Upload, FileVideo } from 'lucide-react'
import { extractYouTubeVideoId } from '@/lib/youtube/extractVideoId'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import type { VideoSource } from '@/types/video.types'

interface VideoUrlFormProps {
  onVideoSourceSelected: (source: VideoSource) => void
}

type InputMethod = 'url' | 'file'

/**
 * امتدادات الفيديو المقبولة كمرجعية إضافية بجانب فحص MIME type — بعض
 * المتصفحات/أنظمة التشغيل لا تُعبّئ file.type بشكل موثوق لكل صيغ الفيديو
 * (خصوصاً .mkv)، فالاعتماد على MIME وحدها قد يرفض ملفات صالحة فعلياً
 */
const ACCEPTED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'ogv', 'mov', 'm4v', 'mkv']

const METHOD_TAB_CLASSNAME = (isActive: boolean) =>
  cn(
    'rounded-sm border px-2.5 py-1.5 font-mono text-[11px] font-medium tracking-wide transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console',
    isActive
      ? 'border-console bg-console/10 text-console'
      : 'border-border text-text-muted hover:border-text-muted hover:text-text-secondary',
  )

/**
 * نموذج بدء المشاهدة — طريقتان مانعتان لبعضهما (radiogroup): رابط يوتيوب،
 * أو رفع ملف فيديو محلي من الجهاز مباشرة. كلا المسارين يُفضيان لنفس تجربة
 * المشاهدة والتحكم بلا أي فرق — نفس شريط التحكم، نفس اختصارات لوحة
 * المفاتيح، نفس الترجمة المزدوجة (انظر useVideoPlayer الذي يوحّد التحكم
 * بمصدري الفيديو خلف واجهة واحدة، فلا يعرف أي مكوّن آخر الفرق بينهما)
 *
 * التحقق من صحة رابط يوتيوب يتم بالكامل عبر extractYouTubeVideoId قبل أي
 * محاولة لبناء عنصر iframe (OWASP Input Validation). التحقق من الملف
 * المحلي يعتمد على نوع MIME أولاً، ثم الامتداد كمرجعية إضافية
 */
export function VideoUrlForm({ onVideoSourceSelected }: VideoUrlFormProps) {
  const [activeTab, setActiveTab] = useState<InputMethod>('url')
  const [inputValue, setInputValue] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleUrlSubmit(event: FormEvent) {
    event.preventDefault()
    const result = extractYouTubeVideoId(inputValue)

    if (!result.success || !result.videoId) {
      setUrlError(result.error ?? 'رابط غير صالح')
      return
    }

    setUrlError(null)
    onVideoSourceSelected({ type: 'youtube', videoId: result.videoId })
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    // إفراغ القيمة فوراً يسمح باختيار نفس الملف مرة أخرى لاحقاً — المتصفح
    // لا يُصدر change ثانية لنفس الملف المُختار بالضبط بدون هذا التصفير
    event.target.value = ''
    if (!file) return

    const isVideoMime = file.type.startsWith('video/')
    const extension = file.name.split('.').pop()?.toLowerCase()
    const hasKnownExtension = Boolean(extension && ACCEPTED_VIDEO_EXTENSIONS.includes(extension))

    if (!isVideoMime && !hasKnownExtension) {
      setFileError('صيغة الملف غير مدعومة — جرّب MP4 أو WebM أو MOV')
      return
    }

    setFileError(null)
    // Object URL مرجع محلي للملف في ذاكرة المتصفح — لا رفع فعلي لأي خادم،
    // يبقى الملف بالكامل على جهاز المستخدم (انظر ملاحظة الخصوصية في README)
    const objectUrl = URL.createObjectURL(file)
    onVideoSourceSelected({ type: 'local', objectUrl, fileName: file.name })
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div role="radiogroup" aria-label="طريقة اختيار الفيديو" className="flex flex-wrap gap-1.5">
        <button
          type="button"
          role="radio"
          aria-checked={activeTab === 'url'}
          onClick={() => setActiveTab('url')}
          className={METHOD_TAB_CLASSNAME(activeTab === 'url')}
        >
          [ رابط URL ]
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={activeTab === 'file'}
          onClick={() => setActiveTab('file')}
          className={METHOD_TAB_CLASSNAME(activeTab === 'file')}
        >
          [ ملف من جهازي ]
        </button>
      </div>

      {activeTab === 'url' ? (
        <form onSubmit={handleUrlSubmit} className="flex w-full flex-col gap-2.5">
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
              aria-invalid={Boolean(urlError)}
              aria-describedby={urlError ? 'youtube-url-error' : undefined}
            />
            <Button type="submit" size="md" className="h-12 shrink-0">
              <Play size={17} aria-hidden="true" />
              تشغيل
            </Button>
          </div>
          {urlError && (
            <p id="youtube-url-error" role="alert" className="flex items-center gap-1.5 text-sm text-error">
              <AlertCircle size={15} aria-hidden="true" />
              {urlError}
            </p>
          )}
        </form>
      ) : (
        <div className="flex w-full flex-col gap-2.5">
          <span className="font-mono text-[11px] tracking-wide text-text-muted">LOCAL_FILE</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-elevated px-4 text-sm font-medium text-text-secondary transition-colors hover:border-console hover:text-console focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-console"
          >
            <Upload size={17} aria-hidden="true" />
            اختر ملف فيديو من جهازك
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="sr-only"
            aria-label="اختيار ملف فيديو محلي"
            onChange={handleFileChange}
          />
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <FileVideo size={13} aria-hidden="true" />
            يبقى الملف على جهازك بالكامل — لا يُرفَع لأي خادم
          </p>
          {fileError && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-error">
              <AlertCircle size={15} aria-hidden="true" />
              {fileError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
