import { useCallback, useState, type PointerEvent } from 'react'

/**
 * Drag inside an SVG whose viewBox matches its rendered pixel size. Calls
 * onDrag with SVG coordinates on press and on every move while pressed.
 */
export function usePointerDrag(onDrag: (x: number, y: number) => void) {
  const [dragging, setDragging] = useState(false)

  const at = useCallback(
    (e: PointerEvent<SVGElement>) => {
      const svg = e.currentTarget.ownerSVGElement ?? e.currentTarget
      const rect = svg.getBoundingClientRect()
      onDrag(e.clientX - rect.left, e.clientY - rect.top)
    },
    [onDrag],
  )

  return {
    dragging,
    handlers: {
      onPointerDown: (e: PointerEvent<SVGElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
        at(e)
      },
      onPointerMove: (e: PointerEvent<SVGElement>) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) at(e)
      },
      onPointerUp: (e: PointerEvent<SVGElement>) => {
        e.currentTarget.releasePointerCapture(e.pointerId)
        setDragging(false)
      },
      onPointerCancel: () => setDragging(false),
    },
  }
}
