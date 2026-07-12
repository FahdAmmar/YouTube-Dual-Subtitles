import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'dual-subtitles:sidebar-width'
const DEFAULT_WIDTH = 380
const MIN_WIDTH = 300
// أقصى عرض كنسبة من عرض منطقة المحتوى الكلية (وليس رقماً ثابتاً) حتى يبقى
// التخطيط متناسقاً على أي حجم شاشة — من اللابتوب الصغير إلى شاشات 4K
// وUltra-wide (متطلب التجاوب المذكور في معايير التصميم)
const MAX_WIDTH_RATIO = 0.6
const KEYBOARD_STEP_PX = 24

interface DragState {
  startClientX: number
  startWidth: number
  maxWidth: number
  /** +1 حين تكون اللوحة الجانبية على يسار الشاشة (كما في الاتجاه RTL الحالي)، -1 حين تكون على اليمين (LTR) — يُحسب مرة واحدة عند بدء السحب */
  directionSign: 1 | -1
}

export interface UseResizableSidebarWidthResult {
  /** العرض الحالي بالبكسل — يُستخدم كمتغيّر CSS مطبَّق فقط على الشاشات الكبيرة */
  width: number
  /** أقصى عرض مسموح به حالياً (يعتمد على عرض النافذة، ويُعاد حسابه عند تغيّر حجمها) — لعرضه بدقة في aria-valuemax */
  maxWidth: number
  minWidth: number
  isDragging: boolean
  containerRef: RefObject<HTMLDivElement>
  onHandlePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onHandleKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
  onHandleDoubleClick: () => void
}

/**
 * يحسب اتجاه اللوحة الجانبية الفعلي (يسار أم يمين) من اتجاه الصفحة الحالي
 * بدل افتراضه ثابتاً — بما أن ترتيب DOM هو [الفيديو، اللوحة الجانبية] داخل
 * حاوية flex-row، فإن اللوحة الجانبية تقع منطقياً عند "نهاية" الاتجاه:
 * اليسار في RTL، اليمين في LTR. حساب هذا ديناميكياً (بدل تثبيته لـ RTL
 * فقط) يجعل الكود صحيحاً حتى لو دُعمت واجهة LTR مستقبلاً دون أي تعديل هنا
 */
function getSidebarDirectionSign(): 1 | -1 {
  return document.documentElement.dir === 'rtl' ? 1 : -1
}

export function useResizableSidebarWidth(): UseResizableSidebarWidthResult {
  const [storedWidth, setStoredWidth] = useLocalStorage(STORAGE_KEY, DEFAULT_WIDTH)
  const [width, setWidth] = useState(storedWidth)
  const [isDragging, setIsDragging] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const latestWidthRef = useRef(width)
  latestWidthRef.current = width

  const computeMaxWidth = useCallback(() => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width
    // قيمة احتياطية معقولة إن تعذّر القياس لأي سبب (بدل NaN/Infinity)
    return Math.max((containerWidth ?? DEFAULT_WIDTH / MAX_WIDTH_RATIO) * MAX_WIDTH_RATIO, MIN_WIDTH)
  }, [])

  const [maxWidth, setMaxWidth] = useState(computeMaxWidth)

  const clampWidth = useCallback((value: number, maxWidth: number) => {
    return Math.min(Math.max(value, MIN_WIDTH), maxWidth)
  }, [])

  const commitWidth = useCallback(
    (value: number) => {
      setWidth(value)
      setStoredWidth(value)
    },
    [setStoredWidth],
  )

  const onHandlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // نتجاهل النقر بغير زر الفأرة الأساسي (مثال: النقر بالزر الأيمن)
      if (event.button !== 0 && event.pointerType === 'mouse') return

      dragStateRef.current = {
        startClientX: event.clientX,
        startWidth: latestWidthRef.current,
        maxWidth: computeMaxWidth(),
        directionSign: getSidebarDirectionSign(),
      }
      setIsDragging(true)
    },
    [computeMaxWidth],
  )

  const onHandleDoubleClick = useCallback(() => {
    // نقرة مزدوجة على المقبض تُعيد العرض للقيمة الافتراضية — نمط شائع
    // ومريح في أدوات اللوحات القابلة لتغيير الحجم (كما في VS Code وغيره)
    commitWidth(DEFAULT_WIDTH)
  }, [commitWidth])

  const onHandleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const maxWidth = computeMaxWidth()
      const directionSign = getSidebarDirectionSign()

      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault()
        // مفاتيح الأسهم تحاكي حركة السحب الفعلية فعلياً (يمين الشاشة يُوسِّع
        // أو يُضيِّق تبعاً لموضع اللوحة الجانبية الحالي) بدل معنى ثابت
        const physicalDelta = event.key === 'ArrowRight' ? KEYBOARD_STEP_PX : -KEYBOARD_STEP_PX
        commitWidth(clampWidth(latestWidthRef.current + directionSign * physicalDelta, maxWidth))
      } else if (event.key === 'Home') {
        event.preventDefault()
        commitWidth(MIN_WIDTH)
      } else if (event.key === 'End') {
        event.preventDefault()
        commitWidth(maxWidth)
      }
    },
    [clampWidth, commitWidth, computeMaxWidth],
  )

  // إعادة حساب أقصى عرض عند التركيب الأولي (بعد أن يصبح containerRef
  // متاحاً فعلياً) وعند كل تغيّر لحجم نافذة المتصفح، مع قصّ العرض الحالي
  // تلقائياً إن أصبح أكبر من المسموح به بعد تصغير النافذة — تجربة سلسة
  // بدل بقاء اللوحة الجانبية بعرض غير متناسب مع نافذة أصغر
  useEffect(() => {
    function syncMaxWidth() {
      const nextMaxWidth = computeMaxWidth()
      setMaxWidth(nextMaxWidth)
      setWidth((previousWidth) => clampWidth(previousWidth, nextMaxWidth))
    }

    syncMaxWidth()
    window.addEventListener('resize', syncMaxWidth)
    return () => window.removeEventListener('resize', syncMaxWidth)
  }, [computeMaxWidth, clampWidth])

  useEffect(() => {
    if (!isDragging) return

    function handlePointerMove(event: PointerEvent) {
      const dragState = dragStateRef.current
      if (!dragState) return
      const delta = (event.clientX - dragState.startClientX) * dragState.directionSign
      setWidth(clampWidth(dragState.startWidth + delta, dragState.maxWidth))
    }

    function endDrag() {
      setIsDragging(false)
      dragStateRef.current = null
      // نحفظ في localStorage فقط عند انتهاء السحب (وليس عند كل حركة فأرة)
      // لتفادي مئات عمليات الكتابة غير الضرورية أثناء السحب الواحد
      setStoredWidth(latestWidthRef.current)
    }

    // نستمع على window (وليس على المقبض نفسه) لأن مؤشر الفأرة قد يتجاوز
    // حدود المقبض الرفيع أثناء السحب السريع — هذا النمط القياسي لأي لوحة
    // قابلة لتغيير الحجم بالسحب
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)

    // قفل مؤشر الفأرة ومنع تحديد النص في كامل الصفحة أثناء السحب، حتى لا
    // يتغيّر شكل المؤشر بشكل مزعج كل مرة يعبر فيها منطقة أخرى (مثال: إطار
    // الفيديو iframe)، ومنع تحديد نص الصفحة عرضياً أثناء السحب السريع
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
  }, [isDragging, clampWidth, setStoredWidth])

  return {
    width,
    maxWidth,
    minWidth: MIN_WIDTH,
    isDragging,
    containerRef,
    onHandlePointerDown,
    onHandleKeyDown,
    onHandleDoubleClick,
  }
}
