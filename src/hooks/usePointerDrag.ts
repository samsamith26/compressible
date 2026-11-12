import { useState, type PointerEvent } from 'react'

export interface Point {
  readonly x: number
  readonly y: number
}

type Handler = (e: PointerEvent<SVGSVGElement>) => void

export interface DragHandlers {
  readonly onPointerDown: Handler
  readonly onPointerMove: Handler
  readonly onPointerUp: Handler
  readonly onPointerCancel: Handler
}

/**
 * Pointer drag on an SVG drawn in CSS pixels: reports positions relative to the SVG's top-left
 * corner from pointerdown until release. `dragging` lets charts turn transitions off.
 * `bind` is called while rendering the SVG, after the chart's scales exist.
 */
export function usePointerDrag(): {
  readonly dragging: boolean
  readonly bind: (onMove: (point: Point) => void, onStart?: () => void) => DragHandlers
} {
  const [dragging, setDragging] = useState(false)

  const end: Handler = (e) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
  }

  return {
    dragging,
    bind: (onMove, onStart) => {
      const report: Handler = (e) => {
        const box = e.currentTarget.getBoundingClientRect()
        onMove({ x: e.clientX - box.left, y: e.clientY - box.top })
      }
      return {
        onPointerDown: (e) => {
          if (e.button !== 0) return
          e.currentTarget.setPointerCapture(e.pointerId)
          setDragging(true)
          onStart?.()
          report(e)
        },
        onPointerMove: (e) => {
          if (dragging) report(e)
        },
        onPointerUp: end,
        onPointerCancel: end,
      }
    },
  }
}
