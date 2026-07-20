import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { STORAGE_KEYS } from '@/constants/theme.constants'

/** إزاحة الترجمة عن موضعها الافتراضي (أسفل الفيديو، وسط أفقياً)، كنسبة مئوية من أبعاد الفيديو — وليس بكسل مطلق، لتبقى صحيحة مهما تغيّر حجم النافذة أو الشاشة */
export interface OverlayPositionOffset {
  xPercent: number
  yPercent: number
}

const DEFAULT_OFFSET: OverlayPositionOffset = { xPercent: 0, yPercent: 0 }

interface DragState {
  startClientX: number
  startClientY: number
  startTranslateXPx: number
  startTranslateYPx: number
  minDeltaX: number
  maxDeltaX: number
  minDeltaY: number
  maxDeltaY: number
  containerWidth: number
  containerHeight: number
}

export interface UseDraggableOverlayPositionResult {
  /** إزاحة الترجمة الحالية كتحويل CSS جاهز للتطبيق مباشرة عبر style */
  transformPx: { x: number; y: number }
  isDragging: boolean
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onDoubleClick: () => void
}

/**
 * يتيح للمستخدم سحب نص الترجمة المحروق فوق الفيديو (SubtitleOverlay) إلى
 * أي موضع آخر *ضمن حدود الفيديو نفسه فقط* — مفيد إذا كانت الترجمة الافتراضية
 * تُغطّي عنصراً مهماً في الصورة (مثال: ترجمة حرفية على الشاشة أو وجه متحدث)
 *
 * التصميم يعتمد على CSS transform فوق الموضع الافتراضي الحالي (بدل إعادة
 * حساب top/left من الصفر)، فيبقى التوسّط الأفقي/السفلي الافتراضي كما هو
 * تماماً عند الإزاحة صفر (تجربة أول استخدام غير متأثرة إطلاقاً)
 *
 * @param containerRef مرجع لعنصر "مسرح" الفيديو الكامل — حدود السحب المسموحة
 * @param overlayRef مرجع للعنصر القابل للسحب نفسه (لقياس أبعاده الفعلية الحالية)
 */
export function useDraggableOverlayPosition(
  containerRef: RefObject<HTMLDivElement>,
  overlayRef: RefObject<HTMLDivElement>,
): UseDraggableOverlayPositionResult {
  const [storedOffset, setStoredOffset] = useLocalStorage<OverlayPositionOffset>(
    STORAGE_KEYS.SUBTITLE_OVERLAY_POSITION,
    DEFAULT_OFFSET,
  )
  const [offset, setOffset] = useState(storedOffset)
  const [isDragging, setIsDragging] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const dragStateRef = useRef<DragState | null>(null)
  const latestOffsetRef = useRef(offset)
  latestOffsetRef.current = offset

  // متابعة أبعاد الحاوية عبر ResizeObserver بدلاً من getBoundingClientRect
  // أثناء كل إعادة رسم — هذا يمنع "Layout Thrashing" الذي يسبب تجمّد
  // الأجهزة المحمولة أثناء التشغيل
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function updateSize() {
      const rect = container!.getBoundingClientRect()
      setContainerSize((prev) => {
        if (prev.width === rect.width && prev.height === rect.height) return prev
        return { width: rect.width, height: rect.height }
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [containerRef])

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return
      const container = containerRef.current
      const overlay = overlayRef.current
      if (!container || !overlay) return

      const containerRect = container.getBoundingClientRect()
      const overlayRect = overlay.getBoundingClientRect()
      const currentOffset = latestOffsetRef.current

      dragStateRef.current = {
        startClientX: event.clientX,
        startClientY: event.clientY,
        startTranslateXPx: (currentOffset.xPercent / 100) * containerRect.width,
        startTranslateYPx: (currentOffset.yPercent / 100) * containerRect.height,
        // الحد الأقصى/الأدنى للإزاحة الإضافية المسموحة بحيث لا تتجاوز حواف
        // الترجمة حدود الفيديو في أي اتجاه — محسوبة من الموضع المُقاس فعلياً
        // الآن (والذي يعكس بالفعل أي إزاحة سابقة محفوظة)
        minDeltaX: containerRect.left - overlayRect.left,
        maxDeltaX: containerRect.right - overlayRect.right,
        minDeltaY: containerRect.top - overlayRect.top,
        maxDeltaY: containerRect.bottom - overlayRect.bottom,
        containerWidth: containerRect.width,
        containerHeight: containerRect.height,
      }
      setIsDragging(true)
    },
    [containerRef, overlayRef],
  )

  const onDoubleClick = useCallback(() => {
    // نقرة مزدوجة تُعيد الترجمة إلى موضعها الافتراضي — نفس نمط إعادة
    // الضبط المُستخدم في مقبض تغيير حجم اللوحة الجانبية، للاتساق
    setOffset(DEFAULT_OFFSET)
    setStoredOffset(DEFAULT_OFFSET)
  }, [setStoredOffset])

  useEffect(() => {
    if (!isDragging) return

    function handlePointerMove(event: PointerEvent) {
      const dragState = dragStateRef.current
      if (!dragState) return

      const rawDeltaX = event.clientX - dragState.startClientX
      const rawDeltaY = event.clientY - dragState.startClientY
      const clampedDeltaX = Math.min(Math.max(rawDeltaX, dragState.minDeltaX), dragState.maxDeltaX)
      const clampedDeltaY = Math.min(Math.max(rawDeltaY, dragState.minDeltaY), dragState.maxDeltaY)

      const newTranslateXPx = dragState.startTranslateXPx + clampedDeltaX
      const newTranslateYPx = dragState.startTranslateYPx + clampedDeltaY

      setOffset({
        xPercent: (newTranslateXPx / dragState.containerWidth) * 100,
        yPercent: (newTranslateYPx / dragState.containerHeight) * 100,
      })
    }

    function endDrag() {
      setIsDragging(false)
      dragStateRef.current = null
      setStoredOffset(latestOffsetRef.current)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
  }, [isDragging, setStoredOffset])

  // حساب التحويل بناءً على النسبة المئوية + أبعاد الحاوية المخزنة
  // بدلاً من استدعاء getBoundingClientRect() عند كل إعادة رسم
  const transformPx = useMemo(
    () => ({
      x: (offset.xPercent / 100) * containerSize.width,
      y: (offset.yPercent / 100) * containerSize.height,
    }),
    [offset.xPercent, offset.yPercent, containerSize.width, containerSize.height],
  )

  return { transformPx, isDragging, onPointerDown, onDoubleClick }
}
