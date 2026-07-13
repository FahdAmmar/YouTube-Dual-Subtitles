import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface PlaybackShortcutFeedback {
  /** معرّف فريد متزايد — يضمن إعادة تشغيل حركة الظهور حتى عند تكرار نفس الاختصار بسرعة */
  id: number
  label: string
  icon: ReactNode
}

interface PlaybackShortcutToastProps {
  feedback: PlaybackShortcutFeedback | null
}

/**
 * تغذية راجعة بصرية لحظية عند استخدام اختصارات لوحة المفاتيح — نمط مألوف
 * من يوتيوب/نتفليكس (وميض أيقونة في منتصف الفيديو) يؤكد للمستخدم أن
 * الاختصار الذي ضغطه (تسريع/إبطاء/تشغيل/ملء شاشة) نُفِّذ فعلاً، خصوصاً
 * أن هذه الاختصارات لا رد فعل مرئي فوري لها غير ذلك (لا توجد قائمة أو زر
 * يتغيّر شكله بشكل واضح عند الضغط على "c" مثلاً)
 */
export function PlaybackShortcutToast({ feedback }: PlaybackShortcutToastProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback.id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex items-center gap-2 rounded-lg bg-black/75 px-4 py-3 text-white shadow-elevated backdrop-blur-sm"
          >
            {feedback.icon}
            <span className="font-mono text-sm font-semibold tabular-nums">{feedback.label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
