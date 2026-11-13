import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * Track an element's content width with a ResizeObserver (charts size to it).
 * Null until measured: measuring in a layout effect, before paint, means charts
 * never draw (and then animate) from a guessed width.
 */
export function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number | null] {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (el === null) return
    const initial = Math.round(el.getBoundingClientRect().width)
    if (initial > 0) setWidth(initial)
    if (typeof ResizeObserver === 'undefined') {
      // No layout engine to measure with (jsdom in tests): use a nominal width.
      if (initial <= 0) setWidth(640)
      return
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w !== undefined && w > 0) setWidth(Math.round(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width]
}
