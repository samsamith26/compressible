/** Colours and density shading for the always-dark porthole window. */

/** Station tints inside the always-dark window (fixed: the window ignores the page theme). */
export const WINDOW = {
  s1: '#2f95d4',
  s2: '#e2609c',
  wall: '#3a4652',
  wallEdge: '#7d8b97',
} as const

/**
 * Grey level for a density relative to the reference: brighter = denser.
 * Log-scaled so ratios from 0.01 to 10 all read; returns a CSS colour.
 */
export function densityFill(rhoRatio: number): string {
  const t = Math.min(1, Math.max(0, (Math.log10(Math.max(rhoRatio, 1e-6)) + 2) / 3))
  const v = Math.round(22 + t * 170)
  return `rgb(${v}, ${v + 4}, ${v + 10})`
}

/** Drawing coordinates inside the window: a 200 × 200 box, glass radius 92. */
export const PORTHOLE = { size: 200, cx: 100, cy: 100, r: 92 } as const
