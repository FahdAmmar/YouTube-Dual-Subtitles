import { AnimatePresence, motion } from 'framer-motion'
import { usePlayerTime } from '@/hooks/usePlayerTime'
import { useActiveCue } from '@/hooks/useActiveCue'
import { useSubtitleSettings } from '@/context/SubtitleSettingsContext'
import type { SubtitleTrackState } from '@/types/subtitle.types'
import type { ViewMode } from '@/types/theme.types'

interface SubtitleOverlayProps {
  sourceTrack: SubtitleTrackState
  translationTrack: SubtitleTrackState
  getCurrentTime: () => number
  isPlaying: boolean
  viewMode: ViewMode
}

/**
 * الترجمة المزدوجة "المحروقة" فوق الفيديو مباشرة (Burned-in Subtitles)
 *
 * تراتبية بصرية مقصودة، مُعاد توازنها لملاءمة سياق تعلّم اللغة: النص
 * الأجنبي (translation) هو الهدف الأساسي الذي يتابعه المستخدم أثناء
 * الاستماع، فيُعرض بخط عريض وبحجمه الكامل كعنصر أساسي؛ بينما النص
 * العربي (source) نص مرجعي مساند يُراجَع عند الحاجة فقط، لذلك يُعرض بحجم
 * مصغّر (85% من القيمة المُعدّة) وبخط مائل أخف وزناً بصرياً — وهذا يعالج
 * أيضاً كون الحروف العربية تبدو "أثقل وأكبر بصرياً" من نظيرتها اللاتينية
 * عند نفس حجم الخط بالبكسل (فرق في مقاييس الخطوط بين الرسمين)، فتقليل
 * حجمها نسبياً يحقق توازناً بصرياً حقيقياً بين اللغتين بدل تفاوت الوزن
 * الحالي. لون كل لغة يبقى ثابتاً (ذهبي/أزرق مخضر) بغض النظر عن هذا الفرق
 * في الوزن، فيسهل تمييزهما حتى عند اختيار المستخدم ألواناً متشابهة.
 *
 * هذا هو المكوّن الوحيد إلى جانب VideoControlBar الذي يشترك في تحديثات
 * الوقت عالية التردد عبر usePlayerTime — بمعزل عن بقية شجرة المكوّنات
 */
export function SubtitleOverlay({
  sourceTrack,
  translationTrack,
  getCurrentTime,
  isPlaying,
  viewMode,
}: SubtitleOverlayProps) {
  const { settings } = useSubtitleSettings()
  const currentTime = usePlayerTime(getCurrentTime, isPlaying)

  const activeSource = useActiveCue(sourceTrack.cues, currentTime - sourceTrack.syncOffsetSeconds)
  const activeTranslation = useActiveCue(
    translationTrack.cues,
    currentTime - translationTrack.syncOffsetSeconds,
  )

  const showSource = viewMode !== 'translation' && activeSource
  const showTranslation = viewMode !== 'source' && activeTranslation

  if (!showSource && !showTranslation) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-1.5 px-4 sm:bottom-6">
      {/* النص العربي المرجعي — أعلى، أصغر، وأخف وزناً بصرياً */}
      <AnimatePresence mode="wait">
        {showSource && (
          <motion.p
            key={`source-${activeSource.text}`}
            dir="auto"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="max-w-[88%] whitespace-pre-line rounded-md bg-black/55 px-3 py-0.5 text-center italic leading-snug"
            style={{
              fontSize: `${settings.trackA.fontSize * 0.85}px`,
              color: settings.trackA.color,
            }}
          >
            {activeSource.text}
          </motion.p>
        )}
      </AnimatePresence>

      {/* النص الأجنبي الأساسي — في موضع الترجمة القياسي الأقرب لحافة الشاشة، بأكبر وزن بصري */}
      <AnimatePresence mode="wait">
        {showTranslation && (
          <motion.p
            key={`translation-${activeTranslation.text}`}
            dir="auto"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="max-w-[94%] whitespace-pre-line rounded-md bg-black/70 px-3.5 py-1.5 text-center font-bold leading-snug shadow-elevated"
            style={{ fontSize: `${settings.trackB.fontSize}px`, color: settings.trackB.color }}
          >
            {activeTranslation.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
