/**
 * Inlet geometry in model units (y up; components flip to SVG). Ramps run corner to corner along
 * the cumulative wall angle; shock i leaves corner i−1 at (wall angle before ramp i) + βᵢ. The drawn
 * area runs from a short lead-in to the end of the last ramp. Shocks meeting each other, or a later
 * ramp, inside that area are flagged: this simple model can't represent the flow beyond them.
 */

import type { Chain, Ramp } from './model'

export interface Pt {
  readonly x: number
  readonly y: number
}

export interface ShockLine {
  /** 1-based ramp index. */
  readonly index: number
  readonly from: Pt
  readonly angleDeg: number
  /** Where the shock leaves the drawn area. */
  readonly to: Pt
}

export interface Conflict {
  readonly kind: 'shocks' | 'wall'
  /** Shock indices, or [shock, ramp] for a wall conflict. */
  readonly between: readonly [number, number]
  readonly at: Pt
}

export interface RegionShape {
  readonly index: number
  readonly polygon: readonly Pt[]
  /** A point inside the region, near its wall, for the region number. */
  readonly label: Pt
}

export interface InletGeometry {
  readonly corners: readonly Pt[]
  readonly shocks: readonly ShockLine[]
  readonly bounds: { readonly x0: number; readonly x1: number; readonly y1: number }
  readonly conflict: Conflict | null
  readonly regions: readonly RegionShape[]
  /** The corner where the chain detached, if it did. */
  readonly detachedCorner: Pt | null
}

const EPS = 1e-9

function rad(deg: number): number {
  return (deg * Math.PI) / 180
}

function dir(deg: number): Pt {
  return { x: Math.cos(rad(deg)), y: Math.sin(rad(deg)) }
}

function along(p: Pt, deg: number, t: number): Pt {
  const d = dir(deg)
  return { x: p.x + d.x * t, y: p.y + d.y * t }
}

/** Where two forward rays meet, or null if they are parallel or meet behind either origin. */
export function rayIntersection(a: Pt, angA: number, b: Pt, angB: number): Pt | null {
  const da = dir(angA)
  const db = dir(angB)
  const den = da.x * db.y - da.y * db.x
  if (Math.abs(den) < EPS) return null
  const t = ((b.x - a.x) * db.y - (b.y - a.y) * db.x) / den
  const u = ((b.x - a.x) * da.y - (b.y - a.y) * da.x) / den
  return t > EPS && u > EPS ? along(a, angA, t) : null
}

/** Where a forward ray crosses the segment p→q (excluding the segment's start), or null. */
function raySegment(a: Pt, angA: number, p: Pt, q: Pt): Pt | null {
  const da = dir(angA)
  const s = { x: q.x - p.x, y: q.y - p.y }
  const den = da.x * s.y - da.y * s.x
  if (Math.abs(den) < EPS) return null
  const t = ((p.x - a.x) * s.y - (p.y - a.y) * s.x) / den
  const u = ((p.x - a.x) * da.y - (p.y - a.y) * da.x) / den
  return t > EPS && u > EPS && u <= 1 ? along(a, angA, t) : null
}

interface Box {
  readonly x0: number
  readonly x1: number
  readonly y1: number
}

/** Exit point of a ray from inside the box through its top, right or left edge. */
function exitPoint(from: Pt, angleDeg: number, box: Box): Pt {
  const d = dir(angleDeg)
  const ts = [
    d.x > EPS ? (box.x1 - from.x) / d.x : Infinity,
    d.y > EPS ? (box.y1 - from.y) / d.y : Infinity,
    d.x < -EPS ? (box.x0 - from.x) / d.x : Infinity,
  ]
  const t = Math.max(0, Math.min(...ts))
  return along(from, angleDeg, Number.isFinite(t) ? t : 0)
}

/**
 * Position along the boundary, counterclockwise: up the right edge from the end of the last
 * ramp, left along the top, then down the left edge to the lead-in floor.
 */
function perimeter(p: Pt, box: Box): number {
  const top = box.y1
  const width = box.x1 - box.x0
  if (Math.abs(p.x - box.x1) < EPS && p.y < top - EPS) return p.y
  if (Math.abs(p.y - top) < EPS) return top + (box.x1 - p.x)
  return top + width + (top - p.y)
}

/** Box corners met walking the boundary from `a` to `b` (either direction). */
function walk(a: Pt, b: Pt, box: Box): Pt[] {
  const sa = perimeter(a, box)
  const sb = perimeter(b, box)
  const corners: Pt[] = [
    { x: box.x1, y: box.y1 },
    { x: box.x0, y: box.y1 },
    { x: box.x0, y: 0 },
  ]
  const between = corners.filter((c) => {
    const s = perimeter(c, box)
    return sa < sb ? s > sa + EPS && s < sb - EPS : s < sa - EPS && s > sb + EPS
  })
  return sa < sb ? between : between.reverse()
}

function centroid(points: readonly Pt[]): Pt {
  const n = points.length
  return { x: points.reduce((s, p) => s + p.x, 0) / n, y: points.reduce((s, p) => s + p.y, 0) / n }
}

export function inletGeometry(chain: Chain, ramps: readonly Ramp[]): InletGeometry {
  // Corners and the wall angle before each ramp.
  const corners: Pt[] = [{ x: 0, y: 0 }]
  const wallBefore: number[] = []
  let cum = 0
  for (const ramp of ramps) {
    wallBefore.push(cum)
    cum += ramp.thetaDeg
    corners.push(along(corners[corners.length - 1] ?? { x: 0, y: 0 }, cum, ramp.length))
  }
  const cEnd = corners[corners.length - 1] ?? { x: 0, y: 0 }

  // Attached shocks as rays.
  const rays = chain.shocks.flatMap((s) =>
    s.kind === 'attached'
      ? [{ index: s.index, from: corners[s.index - 1] ?? { x: 0, y: 0 }, angleDeg: (wallBefore[s.index - 1] ?? 0) + s.state.betaDeg }]
      : [],
  )

  // Drawn area.
  const x0 = -0.3 * (ramps[0]?.length ?? 1)
  const x1 = Math.max(cEnd.x, EPS)
  const first = rays[0]
  const firstAtEnd = first === undefined ? 0 : first.from.y + Math.tan(rad(first.angleDeg)) * (x1 - first.from.x)
  const maxCornerY = Math.max(...corners.map((c) => c.y))
  const y1 = Math.max(Number.isFinite(firstAtEnd) ? firstAtEnd : 0, 1.4 * maxCornerY, 0.35 * x1)
  const box: Box = { x0, x1, y1 }

  const shocks: ShockLine[] = rays.map((r) => ({ ...r, to: exitPoint(r.from, r.angleDeg, box) }))

  // The first conflict (smallest x) inside the drawn area.
  const candidates: Conflict[] = []
  for (const [i, a] of shocks.entries()) {
    const b = shocks[i + 1]
    if (b !== undefined) {
      const at = rayIntersection(a.from, a.angleDeg, b.from, b.angleDeg)
      if (at !== null) candidates.push({ kind: 'shocks', between: [a.index, b.index], at })
    }
    for (let j = a.index + 1; j <= ramps.length; j++) {
      const p = corners[j - 1]
      const q = corners[j]
      if (p === undefined || q === undefined) continue
      const at = raySegment(a.from, a.angleDeg, p, q)
      if (at !== null) candidates.push({ kind: 'wall', between: [a.index, j], at })
    }
  }
  const inside = candidates.filter((c) => c.at.x < x1 - EPS && c.at.y <= y1 + EPS)
  const conflict = inside.reduce<Conflict | null>((best, c) => (best === null || c.at.x < best.at.x ? c : best), null)

  // Regions. Region 1 is upstream of shock 1; region k+1 lies between shock k and shock k+1.
  const regions: RegionShape[] = []
  const firstShock = shocks[0]
  regions.push({
    index: 1,
    polygon:
      firstShock === undefined
        ? [{ x: x0, y: 0 }, ...corners, ...walk(cEnd, { x: x0, y: 0 }, box)]
        : [{ x: x0, y: 0 }, corners[0] ?? { x: 0, y: 0 }, firstShock.to, ...walk(firstShock.to, { x: x0, y: 0 }, box)],
    label: { x: x0 / 2, y: 0.25 * y1 },
  })
  for (const [i, a] of shocks.entries()) {
    const start = corners[a.index - 1] ?? { x: 0, y: 0 }
    const end = corners[a.index] ?? cEnd
    const next = shocks[i + 1]
    const polygon =
      next === undefined
        ? [start, a.to, ...walk(a.to, cEnd, box), cEnd, ...corners.slice(a.index, -1).reverse()]
        : [start, a.to, ...walk(a.to, next.to, box), next.to, end]
    const span = Math.hypot(end.x - start.x, end.y - start.y)
    regions.push({ index: a.index + 1, polygon, label: centroid([start, end, along(start, a.angleDeg, span)]) })
  }

  const detachedCorner = chain.detachedAt === null ? null : (corners[chain.detachedAt - 1] ?? null)
  return { corners, shocks, bounds: { x0, x1, y1 }, conflict, regions, detachedCorner }
}
