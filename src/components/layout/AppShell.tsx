import { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react'
import { Header } from './Header'
import { BackgroundFX } from './BackgroundFX'
import { PanelResizeHandle } from './PanelResizeHandle'
import { PreLoadScreen } from './PreLoadScreen'
import { VideoStage } from '@/components/video/VideoStage'
import { MobileActiveCaption } from '@/components/video/MobileActiveCaption'
import { KeyboardShortcutsPanel } from '@/components/video/KeyboardShortcutsPanel'
import { ConsolePanel } from '@/components/console/ConsolePanel'
import { useVideoPlayer } from '@/hooks/useVideoPlayer'
import { useSubtitleTrack } from '@/hooks/useSubtitleTrack'
import { useResizableSidebarWidth } from '@/hooks/useResizableSidebarWidth'
import { useSidebarPosition, getSidebarFlexOrderClasses } from '@/hooks/useSidebarPosition'
import { useDynamicAccentColor } from '@/hooks/useDynamicAccentColor'
import { useVideoProgress } from '@/hooks/useVideoProgress'
import { useSyncOffsetPersistence } from '@/hooks/useSyncOffsetPersistence'
import { useRecordWatchHistory, useAutoRestoreSubtitles, getHistoryEntryByKey } from '@/hooks/useWatchHistory'
import { useSubtitleUploadHandlers } from '@/hooks/useSubtitleUploadHandlers'
import { useSubtitleSettings } from '@/context/SubtitleSettingsContext'
import { useThemeContext } from '@/context/ThemeContext'
import { pairCuesIntoSlices } from '@/lib/subtitles/pairCues'
import { getVideoKey } from '@/lib/utils/videoKey'
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
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('both')
  // اسم ملف فيديو محلي مطلوب إعادة اختياره يدوياً (نقر مُدخل محلي في سجل
  // المشاهدات) — انظر توثيق useWatchHistory لسبب عدم إمكانية فتحه تلقائياً
  const [pendingLocalFileName, setPendingLocalFileName] = useState<string | null>(null)
  // مرجع مشترك بين VideoStage (اختصار "/") وConsolePanel (الحقل الفعلي) —
  // مكوّنان شقيقان، فلا سبيل لتنسيق التركيز بينهما إلا برفع المرجع لهذا المستوى
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { settings } = useSubtitleSettings()
  const { resolvedTheme } = useThemeContext()
  // لون تمييز الموقع بأكمله مشتق حياً من لون الترجمة الأجنبية (انظر توثيق الـ Hook)
  useDynamicAccentColor(settings.trackB.color, resolvedTheme)

  const player = useVideoPlayer(videoSource)
  useVideoProgress(videoSource, player)
  const sourceTrack = useSubtitleTrack('ar', 'العربية')
  const translationTrack = useSubtitleTrack('en', 'الإنجليزية')
  useSyncOffsetPersistence(
    'source',
    videoSource,
    sourceTrack.track.fileName,
    sourceTrack.track.syncOffsetSeconds,
    sourceTrack.setSyncOffset,
  )
  useSyncOffsetPersistence(
    'translation',
    videoSource,
    translationTrack.track.fileName,
    translationTrack.track.syncOffsetSeconds,
    translationTrack.setSyncOffset,
  )
  useRecordWatchHistory(videoSource, player.videoTitle, sourceTrack.track.fileName, translationTrack.track.fileName)
  // تذكير ملفات الترجمة لهذا الفيديو تحديداً: يُقرأ مرة واحدة فقط لحظة
  // تحميل الفيديو (وليس بشكل حيّ)، فيبقى يعكس آخر زيارة سابقة طوال هذه
  // الجلسة، حتى بعد أن يكتب useRecordWatchHistory أعلاه فوقه لاحقاً
  const historyEntry = useMemo(
    () => (videoSource ? getHistoryEntryByKey(getVideoKey(videoSource)) : null),
    [videoSource],
  )
  // استعادة محتوى ملفات الترجمة تلقائياً (إن وُجد محفوظاً فعلياً في
  // IndexedDB) — بلا أي تدخّل من المستخدم؛ إن لم يكن المحتوى محفوظاً
  // (متصفح قديم، أو أول رفع كان قبل إضافة هذه الميزة) يبقى تذكير
  // SourceFileRow النصي كخطة بديلة صامتة
  useAutoRestoreSubtitles(
    videoSource,
    historyEntry,
    sourceTrack.track.fileName,
    translationTrack.track.fileName,
    sourceTrack.uploadFile,
    translationTrack.uploadFile,
  )
  const sidebarPosition = useSidebarPosition()
  const sidebar = useResizableSidebarWidth(sidebarPosition.position)

  const { onUploadSource, onUploadTranslation, onUploadBilingual, bilingualUpload } = useSubtitleUploadHandlers(
    videoSource,
    sourceTrack,
    translationTrack,
  )

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
    setPendingLocalFileName(null)
    // تصفير مساري الترجمة: بدونه يبقى ملف الفيديو السابق "جاهزاً" ظاهرياً
    // حتى بعد التبديل لفيديو مختلف تماماً — توقيته لا علاقة له بهذا
    // الفيديو الجديد إطلاقاً، وعرضه يُربك المستخدم بترجمة خاطئة تماماً
    sourceTrack.reset()
    translationTrack.reset()
    // sourceTrack.reset/translationTrack.reset مستقران (useCallback([]) داخل
    // useSubtitleTrack)، لكن ESLint لا يستطيع التحقق من ذلك عبر التحليل
    // الساكن ويطلب الكائنين الكاملين كاعتماد رغم أنهما يتغيّران كل rerender
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceTrack.reset, translationTrack.reset])

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

  // المرحلة الأولى: لا يوجد فيديو بعد — انظر توثيق PreLoadScreen لسبب استخلاصها
  if (!videoSource) {
    return (
      <PreLoadScreen
        onVideoSourceSelected={setVideoSource}
        pendingLocalFileName={pendingLocalFileName}
        onSelectLocalFromHistory={setPendingLocalFileName}
      />
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
            onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
            onFocusSearch={() => searchInputRef.current?.focus()}
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
            onUploadSource={onUploadSource}
            onUploadTranslation={onUploadTranslation}
            bilingualUpload={bilingualUpload}
            onUploadBilingual={onUploadBilingual}
            slices={slices}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            getCurrentTime={player.getCurrentTime}
            isPlaying={isPlaying}
            onSeek={player.seekTo}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
            sidebarPosition={sidebarPosition.position}
            onToggleSidebarPosition={sidebarPosition.toggle}
            rememberedSourceFileName={historyEntry?.subtitleFileNames.source}
            rememberedTranslationFileName={historyEntry?.subtitleFileNames.translation}
            searchInputRef={searchInputRef}
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

      <KeyboardShortcutsPanel isOpen={isShortcutsHelpOpen} onClose={() => setIsShortcutsHelpOpen(false)} />
    </div>
  )
}
