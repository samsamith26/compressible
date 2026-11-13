/**
 * Drawing pieces for the porthole: density-shaded regions and the colour
 * schlieren shock (a bright core with cyan and magenta fringes either side).
 */

import { WINDOW } from './shade'

/**
 * A shock along an SVG path. `offset` points from upstream to downstream so the
 * cyan fringe sits on the upstream side and magenta downstream.
 */
export function ShockPath({ d, offset = { x: 1.6, y: 0 } }: { d: string; offset?: { x: number; y: number } }) {
  return (
    <g className="transition-geometry" pointerEvents="none">
      <path d={d} fill="none" stroke={WINDOW.s1} strokeWidth={3} strokeOpacity={0.85} transform={`translate(${-offset.x} ${-offset.y})`} />
      <path d={d} fill="none" stroke={WINDOW.s2} strokeWidth={3} strokeOpacity={0.85} transform={`translate(${offset.x} ${offset.y})`} />
      <path d={d} fill="none" stroke="#ffffff" strokeWidth={1.4} />
    </g>
  )
}

/** Thin streamlines: polylines drawn faintly in the window. */
export function Streamlines({ lines }: { lines: readonly (readonly [number, number])[][] }) {
  return (
    <g fill="none" stroke="#c9d3dc" strokeOpacity={0.28} strokeWidth={0.8} pointerEvents="none">
      {lines.map((pts, i) => (
        <polyline key={i} className="transition-geometry" points={pts.map(([x, y]) => `${x},${y}`).join(' ')} />
      ))}
    </g>
  )
}
