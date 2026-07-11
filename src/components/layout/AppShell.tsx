import { Suspense, lazy, useMemo, useState } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { VideoUrlForm } from '@/components/video/VideoUrlForm'
import { VideoStage } from '@/components/video/VideoStage'
import { ConsolePanel } from '@/components/console/ConsolePanel'
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer'
import { useSubtitleTrack } from '@/hooks/useSubtitleTrack'
import { pairCuesIntoSlices } from '@/lib/subtitles/pairCues'
import { YT_PLAYER_STATE } from '@/types/youtube.types'
import type { ViewMode } from '@/types/theme.types'

// تحميل كسول (Code Splitting) للوحة إعدادات حجم/لون الترجمة: لا يحتاجها
// معظم المستخدمين فور فتح الصفحة، فتحميلها عند الطلب فقط يقلّل حجم الحزمة الأولية
const SettingsPanel = lazy(() =>
  import('@/components/settings/SettingsPanel').then((module) => ({
    default: module.SettingsPanel,
  })),
)

/**
 * المكوّن المنسّق (Orchestrator) الرئيسي للتطبيق
 *
 * تخطيط استجابي بمرحلتين:
 * 1) قبل اختيار فيديو: شاشة إعداد بسيطة في المنتصف (نموذج الرابط فقط)
 * 2) بعد اختيار فيديو: تخطيط لوحة تحكم بعمودين — الفيديو (يمين، أو يسار
 *    حسب الاتجاه) ولوحة الكونسول الجانبية (النص المتزامن وإدارة الملفات).
 *    على الشاشات الكبيرة (lg+) يُثبَّت التخطيط بارتفاع الشاشة كاملاً مع
 *    تمرير داخلي لكل منطقة على حدة (أسلوب تطبيقات لوحة التحكم)؛ على
 *    الجوال يتدفق كل شيء عمودياً بتمرير صفحة طبيعي لتفادي حصر محتوى
 *    كثيف داخل ارتفاع شاشة صغير جداً
 */
export function AppShell() {
  const [videoId, setVideoId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('both')

  const player = useYouTubePlayer(videoId)
  const sourceTrack = useSubtitleTrack('ar', 'العربية')
  const translationTrack = useSubtitleTrack('en', 'الإنجليزية')

  // إعادة بناء قائمة المقاطع الموحّدة فقط عند تغيّر المدخلات الفعلية
  // (المقاطع الخام أو الإزاحة الزمنية)، وليس عند كل نبضة وقت أو تفاعل آخر
  const slices = useMemo(
    () =>
      pairCuesIntoSlices(
        sourceTrack.track.cues,
        translationTrack.track.cues,
        sourceTrack.track.syncOffsetSeconds,
        translationTrack.track.syncOffsetSeconds,
      ),
    [
      sourceTrack.track.cues,
      translationTrack.track.cues,
      sourceTrack.track.syncOffsetSeconds,
      translationTrack.track.syncOffsetSeconds,
    ],
  )

  const isPlaying = player.playerState === YT_PLAYER_STATE.PLAYING

  // المرحلة الأولى: لا يوجد فيديو بعد — شاشة إعداد مركزية بسيطة
  if (!videoId) {
    return (
      <div className="flex min-h-screen flex-col bg-bg">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg">
            <div className="mb-7 text-center">
              <p className="font-mono text-xs tracking-widest text-console">[ INITIALIZE_SESSION ]</p>
              <h1 className="mt-3 text-2xl font-bold text-text-primary">مترجم يوتيوب المزدوج</h1>
              <p className="mt-1.5 text-sm text-text-secondary">
                شاهد أي فيديو مع ترجمتين متزامنتين، جنباً إلى جنب
              </p>
            </div>
            <VideoUrlForm onVideoSelected={setVideoId} />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // المرحلة الثانية: تخطيط لوحة التحكم الكامل بعد اختيار الفيديو
  return (
    <div className="flex flex-col bg-bg lg:h-screen lg:overflow-hidden">
      <Header />

      <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        <main className="flex flex-1 flex-col p-3 sm:p-5 lg:min-w-0 lg:overflow-y-auto">
          <VideoStage
            player={player}
            sourceTrack={sourceTrack.track}
            translationTrack={translationTrack.track}
            viewMode={viewMode}
            onChangeVideo={() => setVideoId(null)}
          />
        </main>

        <div className="flex max-h-[75vh] flex-col border-t border-border lg:h-auto lg:max-h-none lg:min-h-0 lg:w-[380px] lg:shrink-0 lg:border-t-0">
          <ConsolePanel
            sourceTrack={sourceTrack.track}
            translationTrack={translationTrack.track}
            sourceControls={sourceTrack}
            translationControls={translationTrack}
            onUploadSource={sourceTrack.uploadFile}
            onUploadTranslation={translationTrack.uploadFile}
            slices={slices}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            getCurrentTime={player.getCurrentTime}
            isPlaying={isPlaying}
            onSeek={player.seekTo}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>
      </div>

      <Suspense fallback={null}>
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          trackA={sourceTrack.track}
          trackB={translationTrack.track}
        />
      </Suspense>
    </div>
  )
}
