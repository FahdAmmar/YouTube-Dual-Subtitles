import { Suspense, lazy, useMemo, useState } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { PanelResizeHandle } from './PanelResizeHandle'
import { VideoUrlForm } from '@/components/video/VideoUrlForm'
import { VideoStage } from '@/components/video/VideoStage'
import { MobileActiveCaption } from '@/components/video/MobileActiveCaption'
import { ConsolePanel } from '@/components/console/ConsolePanel'
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer'
import { useSubtitleTrack } from '@/hooks/useSubtitleTrack'
import { useResizableSidebarWidth } from '@/hooks/useResizableSidebarWidth'
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
 * 2) بعد اختيار فيديو: تخطيط لوحة تحكم بعمودين — الفيديو ولوحة الكونسول
 *    الجانبية (النص المتزامن وإدارة الملفات):
 *    - الشاشات الكبيرة (lg+): عمودان جنباً إلى جنب بارتفاع الشاشة كاملاً
 *      مع تمرير داخلي مستقل لكل منطقة، ومقبض سحب بينهما لتغيير عرض
 *      اللوحة الجانبية (useResizableSidebarWidth + PanelResizeHandle)
 *    - الجوال: الفيديو "مثبّت" (sticky) أعلى الصفحة فيبقى مرئياً دوماً،
 *      يليه مباشرة شريط مدمج بلا تمرير (MobileActiveCaption) يعرض السطر
 *      الحالي فقط، ثم لوحة الكونسول الكاملة بتمرير صفحة طبيعي أسفل ذلك
 */
export function AppShell() {
  const [videoId, setVideoId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('both')

  const player = useYouTubePlayer(videoId)
  const sourceTrack = useSubtitleTrack('ar', 'العربية')
  const translationTrack = useSubtitleTrack('en', 'الإنجليزية')
  const sidebar = useResizableSidebarWidth()

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
  //
  // على الجوال (أقل من lg): الفيديو "مثبّت" أعلى الصفحة (sticky) فيبقى
  // مرئياً دوماً مهما حدث تمرير أدناه، ومباشرة تحته شريط مدمج (بلا أي
  // تمرير) يعرض فقط السطر المطابق للحظة الحالية — بدل القائمة الكاملة
  // القابلة للتمرير التي كانت تسحب تمرير الصفحة معها وتُخفي الفيديو. لوحة
  // الكونسول الكاملة (رفع/تنزيل/القائمة الكاملة) تتدفق بعدها بتمرير صفحة
  // طبيعي، دون أي خطر على ظهور الفيديو بفضل تثبيته.
  //
  // على الشاشات الكبيرة (lg+): عمودان جنباً إلى جنب بارتفاع الشاشة كاملاً،
  // مع مقبض سحب بينهما (PanelResizeHandle) يتيح تغيير عرض اللوحة الجانبية
  return (
    <div className="flex flex-col bg-bg lg:h-screen lg:overflow-hidden">
      <Header />

      <div ref={sidebar.containerRef} className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        <main className="sticky top-0 z-20 flex flex-col bg-bg p-3 sm:p-5 lg:static lg:z-auto lg:flex-1 lg:min-w-0 lg:overflow-y-auto">
          <VideoStage
            player={player}
            sourceTrack={sourceTrack.track}
            translationTrack={translationTrack.track}
            viewMode={viewMode}
            onChangeVideo={() => setVideoId(null)}
          />
        </main>

        {/* شريط الجوال المدمج — جزء من الكتلة المثبّتة تحديداً لأنه يلي
            <main> مباشرة في نفس تدفق sticky؛ lg:hidden يمنع أي أثر على
            تخطيط الشاشات الكبيرة */}
        <MobileActiveCaption
          slices={slices}
          getCurrentTime={player.getCurrentTime}
          isPlaying={isPlaying}
          viewMode={viewMode}
        />

        <PanelResizeHandle
          width={sidebar.width}
          minWidth={sidebar.minWidth}
          maxWidth={sidebar.maxWidth}
          isDragging={sidebar.isDragging}
          onPointerDown={sidebar.onHandlePointerDown}
          onKeyDown={sidebar.onHandleKeyDown}
          onDoubleClick={sidebar.onHandleDoubleClick}
        />

        <div
          className="flex flex-col border-t border-border lg:h-auto lg:w-[var(--sidebar-width)] lg:shrink-0 lg:border-t-0"
          style={{ '--sidebar-width': `${sidebar.width}px` } as React.CSSProperties}
        >
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

      {/* غطاء شفاف بكامل الشاشة أثناء السحب فقط: يمنع إطار الفيديو
          (iframe من domain مختلف تماماً) من "ابتلاع" أحداث الفأرة أثناء
          مرور المؤشر فوقه، وهي مشكلة معروفة عند بناء لوحات قابلة لتغيير
          الحجم بجوار أي iframe خارجي */}
      {sidebar.isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize" aria-hidden="true" />
      )}

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
