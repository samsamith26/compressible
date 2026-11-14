import type { Pt } from './geometry'

/** Pixel mapping for a flow-field drawing: equal x and y scale, y flipped, the wall body below. */
export interface Frame {
  readonly width: number
  readonly height: number
  readonly toX: (x: number) => number
  readonly toY: (y: number) => number
  /** Pixel position inside the SVG back to model coordinates. */
  readonly toModel: (px: number, py: number) => Pt
  /** Bottom of the drawing, for closing the solid wall body. */
  readonly floorY: number
}

const PAD = 14
const BODY = 22

export function fieldFrame(
  bounds: { readonly x0: number; readonly x1: number; readonly y1: number },
  availableWidth: number,
  maxHeight: number,
): Frame {
  const width = Math.max(availableWidth, 280)
  const spanX = Math.max(bounds.x1 - bounds.x0, 1e-6)
  const spanY = Math.max(bounds.y1, 1e-6)
  const scale = Math.min((width - 2 * PAD) / spanX, (maxHeight - 2 * PAD - BODY) / spanY)
  const height = scale * spanY + 2 * PAD + BODY
  const toX = (x: number) => PAD + (x - bounds.x0) * scale
  const toY = (y: number) => PAD + (bounds.y1 - y) * scale
  return {
    width,
    height,
    toX,
    toY,
    toModel: (px, py) => ({ x: (px - PAD) / scale + bounds.x0, y: bounds.y1 - (py - PAD) / scale }),
    floorY: height,
  }
}
