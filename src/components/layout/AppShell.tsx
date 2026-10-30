import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { PreLoadScreen } from './PreLoadScreen'
import { useDynamicAccentColor } from '@/hooks/useDynamicAccentColor'
import { useSubtitleSettings } from '@/context/SubtitleSettingsContext'
import { useThemeContext } from '@/context/ThemeContext'
import type { VideoSource } from '@/types/video.types'

// The watch screen (players, transcript, dictionary, virtual list) is the larger part of the app and the first
// screen does not need it. It is fetched in the background once the browser is idle, so by the time a video is
// chosen it is usually already there
const loadWatchScreen = () => import('./WatchScreen')
const WatchScreen = lazy(() => loadWatchScreen().then((module) => ({ default: module.WatchScreen })))

const PREFETCH_FALLBACK_DELAY_MS = 2000

/** Starts the background fetch of the watch screen without competing with the first paint */
function usePrefetchWatchScreen(isEnabled: boolean): void {
  useEffect(() => {
    if (!isEnabled) return
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => void loadWatchScreen())
      return () => window.cancelIdleCallback(idleId)
    }
    const timerId = window.setTimeout(() => void loadWatchScreen(), PREFETCH_FALLBACK_DELAY_MS)
    return () => window.clearTimeout(timerId)
  }, [isEnabled])
}

/**
 * Root of the app: two stages
 * 1) before a video is chosen, a small setup screen (a YouTube link or a local file, see PreLoadScreen)
 * 2) after that, the watch screen (see WatchScreen). The video source lives here so that leaving the watch screen
 *    can release a local file's object URL and drop all of the screen's state at once
 */
export function AppShell() {
  const [videoSource, setVideoSource] = useState<VideoSource | null>(null)
  // اسم ملف فيديو محلي مطلوب إعادة اختياره يدوياً (نقر مُدخل محلي في سجل
  // المشاهدات) — انظر توثيق useWatchHistory لسبب عدم إمكانية فتحه تلقائياً
  const [pendingLocalFileName, setPendingLocalFileName] = useState<string | null>(null)

  const { settings } = useSubtitleSettings()
  const { resolvedTheme } = useThemeContext()
  // لون تمييز الموقع مشتق حياً من لون الترجمة الأجنبية — فقط إن فعّل المستخدم ذلك من الإعدادات (انظر توثيق الـ Hook)
  useDynamicAccentColor(settings.trackB.color, resolvedTheme, settings.adaptiveAccent)

  usePrefetchWatchScreen(videoSource === null)

  // الرجوع لشاشة اختيار الفيديو: يجب تحرير Object URL الخاص بأي ملف
  // فيديو محلي كان نشطاً (URL.revokeObjectURL) — وإلا يبقى الملف محجوزاً
  // بالكامل في ذاكرة المتصفح طوال الجلسة حتى لو لم يعد مستخدَماً إطلاقاً
  const handleChangeVideo = useCallback(() => {
    setVideoSource((previous) => {
      if (previous?.type === 'local') {
        URL.revokeObjectURL(previous.objectUrl)
      }
      return null
    })
    setPendingLocalFileName(null)
  }, [])

  if (!videoSource) {
    return (
      <PreLoadScreen
        onVideoSourceSelected={setVideoSource}
        pendingLocalFileName={pendingLocalFileName}
        onSelectLocalFromHistory={setPendingLocalFileName}
      />
    )
  }

  return (
    <Suspense
      fallback={
        <div role="status" className="flex min-h-screen items-center justify-center bg-bg text-sm text-text-muted">
          جارٍ التحميل…
        </div>
      }
    >
      <WatchScreen videoSource={videoSource} onChangeVideo={handleChangeVideo} />
    </Suspense>
  )
}
