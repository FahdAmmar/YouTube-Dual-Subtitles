import { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { BackgroundFX } from './BackgroundFX'
import { PanelResizeHandle } from './PanelResizeHandle'
import { VideoUrlForm } from '@/components/video/VideoUrlForm'
import { VideoStage } from '@/components/video/VideoStage'
import { MobileActiveCaption } from '@/components/video/MobileActiveCaption'
import { ConsolePanel } from '@/components/console/ConsolePanel'
import { useVideoPlayer } from '@/hooks/useVideoPlayer'
import { useSubtitleTrack } from '@/hooks/useSubtitleTrack'
import { useResizableSidebarWidth } from '@/hooks/useResizableSidebarWidth'
import { useSidebarPosition, getSidebarFlexOrderClasses } from '@/hooks/useSidebarPosition'
import { pairCuesIntoSlices } from '@/lib/subtitles/pairCues'
import { parseSubtitleFile, SubtitleParseError } from '@/lib/subtitles/parseSubtitleFile'
import { splitBilingualCues } from '@/lib/subtitles/splitBilingualCues'
import { YT_PLAYER_STATE } from '@/types/youtube.types'
import type { VideoSource } from '@/types/video.types'
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
 * 1) قبل اختيار فيديو: شاشة إعداد بسيطة في المنتصف (رابط يوتيوب أو رفع
 *    ملف محلي — كلاهما عبر useVideoPlayer الذي يوحّد التحكم بمصدري
 *    الفيديو خلف واجهة واحدة، فلا يعرف أي مكوّن لاحق الفرق بينهما)
 * 2) بعد اختيار فيديو: تخطيط لوحة تحكم بعمودين — الفيديو ولوحة الكونسول
 *    الجانبية (النص المتزامن وإدارة الملفات):
 *    - الشاشات الكبيرة (lg+): عمودان جنباً إلى جنب بارتفاع الشاشة كاملاً
 *      مع تمرير داخلي مستقل لكل منطقة، ومقبض سحب بينهما لتغيير عرض
 *      اللوحة الجانبية (useResizableSidebarWidth + PanelResizeHandle)،
 *      وإمكانية تبديل جانب اللوحة الجانبية بالكامل (useSidebarPosition)
 *    - الجوال: الفيديو "مثبّت" (sticky) أعلى الصفحة فيبقى مرئياً دوماً،
 *      يليه مباشرة شريط مدمج بلا تمرير (MobileActiveCaption) يعرض السطر
 *      الحالي فقط، ثم لوحة الكونسول الكاملة بتمرير صفحة طبيعي أسفل ذلك
 */
export function AppShell() {
  const [videoSource, setVideoSource] = useState<VideoSource | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('both')

  const player = useVideoPlayer(videoSource)
  const sourceTrack = useSubtitleTrack('ar', 'العربية')
  const translationTrack = useSubtitleTrack('en', 'الإنجليزية')
  const sidebarPosition = useSidebarPosition()
  const sidebar = useResizableSidebarWidth(sidebarPosition.position)

  // حالة رفع الملف الثنائي اللغة منفصلة عن حالة كل مسار: لأن ملفاً واحداً
  // يُغذّي المسارين معاً، نحتاج لحالة مستقلة نعرضها في صف الرفع الثنائي
  // (parsing/error/ready) دون التداخل مع حالة كل مسار على حدة
  const [bilingualUpload, setBilingualUpload] = useState<{
    status: 'idle' | 'parsing' | 'ready' | 'error'
    fileName: string | null
    errorMessage: string | null
  }>({ status: 'idle', fileName: null, errorMessage: null })

  // اتجاه الصفحة الفعلي (مضبوط في index.html) — يُقرأ مباشرة لأنه لا
  // يتغيّر ديناميكياً في هذا التطبيق، فلا حاجة لحالة React أو مستمع أحداث
  const documentDirection = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
  const flexOrder = getSidebarFlexOrderClasses(sidebarPosition.position, documentDirection)

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
  }, [])

  // رفع ملف ثنائي اللغة: يُحلَّل مرة واحدة ثم يُقسَّم إلى مسارين بنفس
  // التوقيت، فيُحمَّل كلٌّ منهما مباشرةً عبر loadCues دون إعادة تحليل.
  // النتيجة: نفس تصميم لوحة النص والترجمة فوق الفيديو المعتاد، كأن المستخدم
  // رفع ملفّين منفصلين تماماً
  const { loadCues: loadSourceCues } = sourceTrack
  const { loadCues: loadTranslationCues } = translationTrack
  const handleUploadBilingual = useCallback(
    async (file: File) => {
      setBilingualUpload({ status: 'parsing', fileName: null, errorMessage: null })
      try {
        const cues = await parseSubtitleFile(file)
        const { sourceCues, translationCues } = splitBilingualCues(cues)
        if (sourceCues.length === 0 && translationCues.length === 0) {
          throw new SubtitleParseError('لم يُعثَر على نص ترجمة صالح داخل الملف')
        }
        loadSourceCues(sourceCues, file.name)
        loadTranslationCues(translationCues, file.name)
        setBilingualUpload({ status: 'ready', fileName: file.name, errorMessage: null })
      } catch (error) {
        const message =
          error instanceof SubtitleParseError
            ? error.message
            : 'حدث خطأ غير متوقع أثناء قراءة الملف'
        setBilingualUpload({ status: 'error', fileName: null, errorMessage: message })
      }
    },
    [loadSourceCues, loadTranslationCues],
  )

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
  if (!videoSource) {
    return (
      <div className="relative flex min-h-screen flex-col">
        <BackgroundFX />
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
          <div className="w-full max-w-lg">
            <div className="mb-8 text-center sm:mb-9">
              {/* شارة "الجلسة جاهزة" — نقطة نابضة + نص بفونت مونو، تمنح
                  إحساس لوحة تحكم حيّة فور فتح الصفحة دون ضوضاء بصرية */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-console/30 bg-console/5 px-3 py-1.5 font-mono text-[10px] tracking-widest text-console">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-console opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-console" />
                </span>
                INITIALIZE_SESSION
              </div>
              <h1 className="text-gradient-hero text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                مترجم يوتيوب المزدوج
              </h1>
              <p className="mt-2 text-sm text-text-secondary sm:mt-2.5 sm:text-base">
                شاهد أي فيديو مع ترجمتين متزامنتين، جنباً إلى جنب
              </p>
            </div>
            <VideoUrlForm onVideoSourceSelected={setVideoSource} />
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
  // طبيعي، دون أي خطر على ظهور الفيديو بفضل تثبيته. ترتيب DOM هنا ثابت
  // دوماً بغض النظر عن sidebarPosition — التبديل البصري يتم فقط عبر
  // أصناف lg:order-* (flexOrder)، فيبقى ترتيب الجوال الطبيعي (فيديو ثم
  // شريط مدمج ثم لوحة الكونسول) غير متأثر بتفضيل سطح المكتب إطلاقاً
  //
  // على الشاشات الكبيرة (lg+): عمودان جنباً إلى جنب بارتفاع الشاشة كاملاً،
  // مع مقبض سحب بينهما (PanelResizeHandle) يتيح تغيير عرض اللوحة الجانبية
  return (
    <div className="relative flex flex-col bg-bg lg:h-screen lg:overflow-hidden">
      <BackgroundFX />
      <Header />

      <div ref={sidebar.containerRef} className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        <main
          className={`sticky top-0 z-20 flex flex-col bg-bg p-3 sm:p-5 lg:static lg:z-auto lg:flex-1 lg:min-w-0 lg:overflow-y-auto ${flexOrder.video}`}
        >
          <VideoStage
            player={player}
            sourceTrack={sourceTrack.track}
            translationTrack={translationTrack.track}
            viewMode={viewMode}
            onChangeVideo={handleChangeVideo}
            slices={slices}
          />
        </main>

        {/* شريط الجوال المدمج — جزء من الكتلة المثبّتة تحديداً لأنه يلي
            <main> مباشرة في نفس تدفق sticky؛ lg:hidden يمنع أي أثر على
            تخطيط الشاشات الكبيرة (ولا يحتاج أصناف order لأنه بلا عرض أصلاً هناك) */}
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
          className={flexOrder.handle}
        />

        <div
          className={`flex flex-col border-t border-border lg:h-auto lg:w-[var(--sidebar-width)] lg:shrink-0 lg:border-t-0 lg:border-border ${flexOrder.sidebar} ${flexOrder.sidebarBorderClass}`}
          style={{ '--sidebar-width': `${sidebar.width}px` } as React.CSSProperties}
        >
          <ConsolePanel
            sourceTrack={sourceTrack.track}
            translationTrack={translationTrack.track}
            sourceControls={sourceTrack}
            translationControls={translationTrack}
            onUploadSource={sourceTrack.uploadFile}
            onUploadTranslation={translationTrack.uploadFile}
            bilingualUpload={bilingualUpload}
            onUploadBilingual={handleUploadBilingual}
            slices={slices}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            getCurrentTime={player.getCurrentTime}
            isPlaying={isPlaying}
            onSeek={player.seekTo}
            onOpenSettings={() => setIsSettingsOpen(true)}
            sidebarPosition={sidebarPosition.position}
            onToggleSidebarPosition={sidebarPosition.toggle}
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
