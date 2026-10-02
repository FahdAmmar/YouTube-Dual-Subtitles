import { Header } from './Header'
import { Footer } from './Footer'
import { BackgroundFX } from './BackgroundFX'
import { VideoUrlForm } from '@/components/video/VideoUrlForm'
import { WatchHistoryList } from '@/components/video/WatchHistoryList'
import { LearningStatsCard } from '@/components/video/LearningStatsCard'
import type { VideoSource } from '@/types/video.types'

interface PreLoadScreenProps {
  onVideoSourceSelected: (source: VideoSource) => void
  pendingLocalFileName: string | null
  onSelectLocalFromHistory: (fileName: string) => void
}

/**
 * المرحلة الأولى من AppShell: شاشة إعداد مركزية بسيطة قبل اختيار أي
 * فيديو — سجل المشاهدات (إن وُجد) فوق نموذج إدخال الرابط/الملف.
 *
 * مُستخرَجة كمكوّن مستقل لأنها حالة واجهة منفصلة تماماً عن "المرحلة
 * الثانية" (تخطيط لوحة التحكم الكامل بعد اختيار الفيديو) — الحالتان
 * متبادلتان تماماً (لا تظهران معاً أبداً)، وهذه الشاشة تحديداً لا تعتمد
 * على مصدر الفيديو أو مساري الترجمة أو أي حالة أخرى يُنسِّقها AppShell
 * بعد اختيار الفيديو، فعزلها هنا يقلّل ما يحتاج القارئ فهمه عند العمل
 * على أي من المرحلتين دون الأخرى
 */
export function PreLoadScreen({ onVideoSourceSelected, pendingLocalFileName, onSelectLocalFromHistory }: PreLoadScreenProps) {
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
          <WatchHistoryList
            onSelectYoutube={(videoId) => onVideoSourceSelected({ type: 'youtube', videoId })}
            onSelectVimeo={(videoId, hash) => onVideoSourceSelected({ type: 'vimeo', videoId, hash })}
            onSelectLocal={onSelectLocalFromHistory}
          />
          <VideoUrlForm onVideoSourceSelected={onVideoSourceSelected} pendingLocalFileName={pendingLocalFileName} />
          <LearningStatsCard />
        </div>
      </main>
      <Footer />
    </div>
  )
}
