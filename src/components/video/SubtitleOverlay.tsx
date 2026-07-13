import { useRef, type RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePlayerTime } from '@/hooks/usePlayerTime'
import { useActiveCue } from '@/hooks/useActiveCue'
import { useDraggableOverlayPosition } from '@/hooks/useDraggableOverlayPosition'
import { useSubtitleSettings } from '@/context/SubtitleSettingsContext'
import { cn } from '@/lib/utils/cn'
import type { SubtitleTrackState } from '@/types/subtitle.types'
import type { ViewMode } from '@/types/theme.types'

interface SubtitleOverlayProps {
  sourceTrack: SubtitleTrackState
  translationTrack: SubtitleTrackState
  getCurrentTime: () => number
  isPlaying: boolean
  viewMode: ViewMode
  /** مرجع "مسرح" الفيديو الكامل — الحدود التي يُحصر ضمنها سحب الترجمة (لا يمكن سحبها خارج الفيديو) */
  stageRef: RefObject<HTMLDivElement>
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
 *
 * قابلة للسحب: يمكن للمستخدم سحب فقاعة الترجمة لأي موضع آخر *ضمن حدود
 * الفيديو نفسه فقط* (انظر useDraggableOverlayPosition) — مفيد إذا كانت
 * تُغطّي عنصراً مهماً في الصورة. المنطقة الفارغة المحيطة تبقى
 * pointer-events-none كي لا تحجب النقر على الفيديو أو شريط التحكم أسفله؛
 * فقاعة الترجمة نفسها فقط هي pointer-events-auto وقابلة للسحب
 */
export function SubtitleOverlay({
  sourceTrack,
  translationTrack,
  getCurrentTime,
  isPlaying,
  viewMode,
  stageRef,
}: SubtitleOverlayProps) {
  const { settings } = useSubtitleSettings()
  const currentTime = usePlayerTime(getCurrentTime, isPlaying)
  const overlayRef = useRef<HTMLDivElement>(null)
  const { transformPx, isDragging, onPointerDown, onDoubleClick } = useDraggableOverlayPosition(
    stageRef,
    overlayRef,
  )

  const activeSource = useActiveCue(sourceTrack.cues, currentTime - sourceTrack.syncOffsetSeconds)
  const activeTranslation = useActiveCue(
    translationTrack.cues,
    currentTime - translationTrack.syncOffsetSeconds,
  )

  const showSource = viewMode !== 'translation' && activeSource
  const showTranslation = viewMode !== 'source' && activeTranslation

  if (!showSource && !showTranslation) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4 sm:bottom-6">
      <div
        ref={overlayRef}
        data-testid="draggable-subtitle-overlay"
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        style={{ transform: `translate(${transformPx.x}px, ${transformPx.y}px)` }}
        title="اسحب لتحريك الترجمة، أو انقر نقراً مزدوجاً لإعادتها لموضعها الافتراضي"
        className={cn(
          'pointer-events-auto flex touch-none select-none flex-col items-center gap-1.5 rounded-md ring-white/0 ring-offset-2 ring-offset-transparent transition-shadow hover:ring-2 hover:ring-white/25',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
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
    </div>
  )
}
