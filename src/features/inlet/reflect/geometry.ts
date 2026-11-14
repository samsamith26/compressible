/**
 * Drawing geometry for the reflecting-shock inlet (model units, y up): the ramp and cowl, the
 * regions between consecutive shocks, angle labels, where the chain stopped, and the maths for the
 * θ, H and L handles.
 */

import type { FieldShock, FieldStop } from '@/features/inlet/shared/InletField'
import type { Pt, RegionShape } from '@/features/inlet/shared/types'
import type { ReflectSolution } from './model'

export interface ReflectGeometry {
  readonly bounds: { readonly x0: number; readonly x1: number; readonly y1: number }
  readonly lowerWall: readonly Pt[]
  readonly upperWall: readonly Pt[]
  readonly regions: readonly RegionShape[]
  readonly shocks: readonly FieldShock[]
  readonly stop: FieldStop | null
}

function centroid(points: readonly Pt[]): Pt {
  const n = points.length
  return { x: points.reduce((s, p) => s + p.x, 0) / n, y: points.reduce((s, p) => s + p.y, 0) / n }
}

const STOP_TEXT = {
  machReflection: 'Mach reflection (not modeled)',
  leadingEdge: 'bow shock',
  subsonic: 'subsonic',
} as const

export function reflectGeometry(s: ReflectSolution): ReflectGeometry {
  const { height: H, thetaDeg } = s.input
  const tan = Math.tan((thetaDeg * Math.PI) / 180)
  const x0 = -0.3 * H
  const x1 = s.channelEndX
  const lead: Pt = { x: 0, y: 0 }
  const rampEnd: Pt = { x: x1, y: x1 * tan }
  const cowlStart: Pt = { x: 0, y: H }
  const cowlEnd: Pt = { x: x1, y: H }
  const endOf = (wall: 'ramp' | 'cowl'): Pt => (wall === 'ramp' ? rampEnd : cowlEnd)
  const other = (wall: 'ramp' | 'cowl'): 'ramp' | 'cowl' => (wall === 'ramp' ? 'cowl' : 'ramp')
  const exited = s.stop.kind === 'channelEnd'
  const n = s.shocks.length

  const polygons: Pt[][] = []
  const first = s.shocks[0]
  // Region 1: the lead-in and the wedge ahead of the first shock.
  polygons.push(
    first === undefined
      ? [{ x: x0, y: 0 }, lead, rampEnd, cowlEnd, cowlStart, { x: x0, y: H }]
      : [{ x: x0, y: 0 }, lead, first.to, ...(exited && n === 1 ? [cowlEnd] : []), cowlStart, { x: x0, y: H }],
  )
  // Region k+1: between shock k and shock k+1 (a triangle on the walls, or cut by the channel end).
  for (let k = 1; k < n; k++) {
    const a = s.shocks[k - 1]
    const b = s.shocks[k]
    if (a === undefined || b === undefined) continue
    polygons.push(exited && k + 1 === n ? [a.from, a.to, b.to, endOf(a.fromWall)] : [a.from, a.to, b.to])
  }
  // The region behind the last shock reaches the channel end.
  const last = s.shocks[n - 1]
  if (last !== undefined) {
    polygons.push(exited ? [last.from, last.to, endOf(last.fromWall)] : [last.from, last.to, endOf(other(last.fromWall)), endOf(last.fromWall)])
  }

  const regions = s.chain.regions.flatMap((r, i) => {
    const polygon = polygons[i]
    return polygon === undefined ? [] : [{ index: r.index, polygon, label: centroid(polygon) }]
  })

  const stop: FieldStop | null =
    s.stop.kind === 'machReflection' || s.stop.kind === 'subsonic'
      ? { at: s.stop.at, text: STOP_TEXT[s.stop.kind] }
      : s.stop.kind === 'leadingEdge'
        ? { at: lead, text: STOP_TEXT.leadingEdge }
        : null

  return {
    bounds: { x0, x1, y1: 1.15 * H },
    lowerWall: [{ x: x0, y: 0 }, lead, rampEnd],
    upperWall: [cowlStart, cowlEnd],
    regions,
    shocks: s.shocks.map((k) => ({
      index: k.index,
      from: k.from,
      to: k.to,
      label: `${k.wallAngleDeg.toFixed(1)}° to ${k.fromWall}`,
    })),
    stop,
  }
}

// --- Handles -------------------------------------------------------------------------------

export const LIMITS = {
  theta: { min: 0.5, max: 40, step: 0.5, big: 2 },
  height: { min: 0.05, max: 5, step: 0.05, big: 0.2 },
  length: { min: 0.2, max: 20, step: 0.1, big: 0.5 },
} as const

export type ReflectHandle = keyof typeof LIMITS

function clamp(v: number, which: ReflectHandle): number {
  return Math.min(LIMITS[which].max, Math.max(LIMITS[which].min, v))
}

/** θ from the pointer's angle seen from the leading edge. */
export function thetaFromPointer(p: Pt): number {
  return clamp((Math.atan2(p.y, p.x) * 180) / Math.PI, 'theta')
}

export function heightFromPointer(p: Pt): number {
  return clamp(p.y, 'height')
}

export function lengthFromPointer(p: Pt): number {
  return clamp(p.x, 'length')
}

/** Arrow keys step a handle's value (Shift for a bigger step); null for other keys. */
export function nudgeReflect(which: ReflectHandle, value: number, key: string, shift: boolean): number | null {
  const up = key === 'ArrowUp' || key === 'ArrowRight'
  const down = key === 'ArrowDown' || key === 'ArrowLeft'
  if (!up && !down) return null
  const step = shift ? LIMITS[which].big : LIMITS[which].step
  return Math.round(clamp(value + (up ? step : -step), which) * 1000) / 1000
}
