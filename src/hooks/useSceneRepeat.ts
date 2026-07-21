import { useCallback, useEffect, useRef, useState } from 'react'
import { YT_PLAYER_STATE } from '@/types/youtube.types'
import type { PairedSlice } from '@/lib/subtitles/pairCues'
import type { UseVideoPlayerResult } from './useVideoPlayer'

export interface SceneRepeatState {
  /** بداية المقطع المُكرَّر، بالثواني */
  sceneStart: number
  /** نهاية المقطع المُكرَّر، بالثواني */
  sceneEnd: number
  /** إجمالي مرات التشغيل المطلوبة (شاملةً التشغيل الحالي) — ثابت بعد الإنشاء */
  totalLoops: number
  /** مرات التشغيل المتبقية شاملةً الحالية — تتناقص كلما انتهى المقطع */
  remainingLoops: number
}

export interface UseSceneRepeatResult {
  /** حالة التكرار النشطة حالياً (null = لا تكرار نشط) */
  repeatState: SceneRepeatState | null
  /** إيجاد المقطع الزمني الموافق للحظة الحالية (أو أول مقطع كخيار احتياطي) */
  findCurrentScene: () => PairedSlice | null
  /** إعادة تشغيل المقطع الحالي من بدايته (مرة واحدة، بلا تكرار) — اختصار "0" */
  restartScene: (scene: PairedSlice) => void
  /** تكرار المقطع الحالي عدداً محدداً من المرات — اختصارات "1"/"2"/"3" */
  repeatScene: (scene: PairedSlice, totalLoops: number) => void
  /** إلغاء أي تكرار نشط فوراً (دون التأثير على التشغيل نفسه) */
  cancelRepeat: () => void
}

/** فترة استطلاع الوقت لكشف نهاية المقطع أثناء التكرار — 200ms توازن جيد
 *  بين الاستجابة وكلفة الاستطلاع */
const REPEAT_POLL_INTERVAL_MS = 200

/**
 * Hook لإدارة "تكرار المشهد": يسمح بإعادة تشغيل المقطع الحالي من بدايته،
 * أو تكراره عدداً محدداً من المرات (2/3/4 مرات) ثم استئناف التشغيل الطبيعي.
 *
 * قرار أداء مهم: على عكس usePlayerTime، هذا الـ Hook لا يُشغِّل إعادة رسم
 * VideoStage عند كل نبضة وقت — فالمؤشّر "1/3" مثلاً لا يتغيّر إلا عند
 * تناقص العدّاد (أي كل بضع ثوانٍ)، لا كل 200ms. يُتحقَّق من الوقت عبر
 * استطلاع مستقل بـ setInterval يقرأ getCurrentTime() إمبراطيفياً (بلا
 * useSyncExternalStore)، فلا يُشغَّل أي إعادة رسم إلا عند تغيّر repeatState
 * فعلياً (بدء/تناقص/انتهاء التكرار).
 *
 * منطق كشف نهاية المقطع: عند بلوغ currentTime نهاية المقطع أثناء تكرار
 * نشط: تُتناقص العدّاد، ويُعاد القفز لبداية المقطع، وحين ينفد العدّاد
 * يُلغى التكرار ويستمر التشغيل الطبيعي للمقطع التالي.
 *
 * إصلاح دقة القفز (awaitingSeekRef): seekTo على مشغّل يوتيوب غير متزامن
 * (جسر postMessage)، فبعد طلب القفز لبداية المقطع قد يبقى currentTime
 * يُبلّغ عن قيمة قديمة (>= sceneEnd) لبضعة دورات استطلاع — مما كان سيُفعّل
 * كشف "نهاية المقطع" زوراً ويُنهي التكرار قبل أوانه. العلامة awaitingSeek
 * تتجاهل قراءات الوقت القديمة حتى يُبلّغ المشغّل عن وقت أقل من sceneEnd
 * (إشارة لاستيفاء القفز فعلاً)، عندها تُصفَّر العلامة ويُستأنف الكشف الطبيعي.
 */
export function useSceneRepeat(
  player: UseVideoPlayerResult,
  slices: PairedSlice[],
  isPlaying: boolean,
): UseSceneRepeatResult {
  const [repeatState, setRepeatState] = useState<SceneRepeatState | null>(null)
  const repeatStateRef = useRef<SceneRepeatState | null>(null)
  repeatStateRef.current = repeatState

  const slicesRef = useRef(slices)
  slicesRef.current = slices

  const playerRef = useRef(player)
  playerRef.current = player

  // علامة "قفزة معلّقة": تُمنع قراءات الوقت القديمة بعد seekTo من إعادة
  // تفعيل كشف نهاية المقطع زوراً قبل أن يُستوفى القفز فعلياً
  const awaitingSeekRef = useRef(false)

  const ensurePlaying = useCallback(() => {
    if (playerRef.current.playerState !== YT_PLAYER_STATE.PLAYING) {
      playerRef.current.play()
    }
  }, [])

  const findCurrentScene = useCallback((): PairedSlice | null => {
    const currentSlices = slicesRef.current
    if (currentSlices.length === 0) return null
    const t = playerRef.current.getCurrentTime()
    // المقطع الذي يحوي اللحظة الحالية؛ إن لم يوجد (فجوة بين مقطعين) نعود
    // لأول مقطع كي لا يكون الاختصار بلا أثر عند بداية الفيديو تحديداً
    return currentSlices.find((s) => t >= s.start && t < s.end) ?? currentSlices[0] ?? null
  }, [])

  const restartScene = useCallback(
    (scene: PairedSlice) => {
      playerRef.current.seekTo(scene.start)
      ensurePlaying()
      setRepeatState(null)
      repeatStateRef.current = null
      awaitingSeekRef.current = true
    },
    [ensurePlaying],
  )

  const repeatScene = useCallback(
    (scene: PairedSlice, totalLoops: number) => {
      const loops = Math.max(1, Math.floor(totalLoops))
      const state: SceneRepeatState = {
        sceneStart: scene.start,
        sceneEnd: scene.end,
        totalLoops: loops,
        remainingLoops: loops,
      }
      playerRef.current.seekTo(scene.start)
      ensurePlaying()
      setRepeatState(state)
      repeatStateRef.current = state
      awaitingSeekRef.current = true
    },
    [ensurePlaying],
  )

  const cancelRepeat = useCallback(() => {
    setRepeatState(null)
    repeatStateRef.current = null
    awaitingSeekRef.current = false
  }, [])

  // استطلاع مستقل لكشف نهاية المقطع — يُشغَّل فقط أثناء التشغيل الفعلي
  // (isPlaying)، ويقرأ الوقت إمبراطيفياً دون إحداث إعادة رسم. لا يُستدعى
  // useSyncExternalStore هنا عمداً، فلا يُعاد رسم VideoStage إلا عند تغيّر
  // repeatState فعلياً (تناقص العدّاد أو انتهاء التكرار)
  useEffect(() => {
    if (!isPlaying) return

    const intervalId = setInterval(() => {
      const state = repeatStateRef.current
      if (!state) return

      const currentTime = playerRef.current.getCurrentTime()

      // إن كنّا ننتظر استيفاء قفزة سابقة: نتجاهل القراءات حتى يُبلّغ المشغّل
      // عن وقت أقل من نهاية المقطع (دليل أن القفز لبداية المقطع قد استُوفي)
      if (awaitingSeekRef.current) {
        if (currentTime < state.sceneEnd) {
          awaitingSeekRef.current = false
        }
        return
      }

      if (currentTime < state.sceneEnd) return

      // بلوغ نهاية المقطع: تناقص العدّاد، وإما قفزة لبدايته لتكرار جديد،
      // أو إلغاء التكرار عند نفاد العدّاد ليستأنف التشغيل الطبيعي للمقطع التالي
      if (state.remainingLoops > 1) {
        const next: SceneRepeatState = {
          ...state,
          remainingLoops: state.remainingLoops - 1,
        }
        setRepeatState(next)
        repeatStateRef.current = next
        awaitingSeekRef.current = true
        playerRef.current.seekTo(state.sceneStart)
      } else {
        setRepeatState(null)
        repeatStateRef.current = null
      }
    }, REPEAT_POLL_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [isPlaying])

  return { repeatState, findCurrentScene, restartScene, repeatScene, cancelRepeat }
}
