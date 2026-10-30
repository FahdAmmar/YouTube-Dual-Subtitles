import { useEffect, useState, type RefObject } from 'react'

/**
 * Current width of an element in CSS pixels, kept up to date while it resizes. Returns 0 until it is known
 * (before the first measurement, or where the browser reports no layout), which callers treat as "unknown".
 */
export function useElementWidth(ref: RefObject<HTMLElement>): number {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    // offsetWidth is a whole number, so sub-pixel layout noise never causes a re-render
    const measure = () => setWidth(element.offsetWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return width
}
