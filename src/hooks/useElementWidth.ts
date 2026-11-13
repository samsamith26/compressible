import { useEffect, useRef, useState, type RefObject } from 'react'

/** Track an element's content width (it should have no horizontal padding), so charts draw in real pixels (crisp text at any size). */
export function useElementWidth<T extends HTMLElement>(fallback = 640): readonly [RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const el = ref.current
    if (el === null) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}
