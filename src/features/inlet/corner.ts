/** Ramp corners as controls: pointer position or arrow keys → that ramp's angle and length. */

import type { Pt } from './geometry'
import type { Ramp } from './model'

const THETA_MAX = 45
const LENGTH_MIN = 0.05
const LENGTH_MAX = 10

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** Wall angle before ramp `index0`: the sum of the earlier ramps' turns. */
export function wallAngleBefore(ramps: readonly Ramp[], index0: number): number {
  return ramps.slice(0, index0).reduce((sum, r) => sum + r.thetaDeg, 0)
}

/** The ramp that ends at `pointer`, starting from `previous` with the wall at `wallBeforeDeg`. */
export function cornerFromPointer(previous: Pt, wallBeforeDeg: number, pointer: Pt): Ramp {
  const dx = pointer.x - previous.x
  const dy = pointer.y - previous.y
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI
  return {
    thetaDeg: clamp(angle - wallBeforeDeg, 0, THETA_MAX),
    length: clamp(Math.hypot(dx, dy), LENGTH_MIN, LENGTH_MAX),
  }
}

/** Up/Down change the angle by 0.5° (Shift: 2°); Left/Right the length by 0.05 (Shift: 0.2). */
export function nudgeCorner(ramp: Ramp, key: string, shift: boolean): Ramp | null {
  const round = (v: number) => Math.round(v * 1000) / 1000
  const dTheta = shift ? 2 : 0.5
  const dLength = shift ? 0.2 : 0.05
  switch (key) {
    case 'ArrowUp':
      return { ...ramp, thetaDeg: round(clamp(ramp.thetaDeg + dTheta, 0, THETA_MAX)) }
    case 'ArrowDown':
      return { ...ramp, thetaDeg: round(clamp(ramp.thetaDeg - dTheta, 0, THETA_MAX)) }
    case 'ArrowRight':
      return { ...ramp, length: round(clamp(ramp.length + dLength, LENGTH_MIN, LENGTH_MAX)) }
    case 'ArrowLeft':
      return { ...ramp, length: round(clamp(ramp.length - dLength, LENGTH_MIN, LENGTH_MAX)) }
    default:
      return null
  }
}
