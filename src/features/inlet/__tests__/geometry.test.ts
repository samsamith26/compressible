import { describe, expect, it } from 'vitest'
import { inletGeometry, rayIntersection, type InletGeometry } from '../geometry'
import { DEFAULT_RAMPS, solveChain, type Ramp } from '../model'

function geometry(m1: number, ramps: readonly Ramp[]): InletGeometry {
  const chain = solveChain(m1, ramps, 1.4)
  if (!chain.ok) throw new Error(chain.error.message)
  return inletGeometry(chain.value, ramps)
}

function allFinite(g: InletGeometry): boolean {
  const pts = [
    ...g.corners,
    ...g.shocks.flatMap((s) => [s.from, s.to]),
    ...g.regions.flatMap((r) => [...r.polygon, r.label]),
    ...(g.conflict === null ? [] : [g.conflict.at]),
  ]
  return pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) && Number.isFinite(g.bounds.y1)
}

const ramps = (thetas: number[], lengths: number[]): Ramp[] => thetas.map((thetaDeg, i) => ({ thetaDeg, length: lengths[i] ?? 1 }))

describe('rayIntersection', () => {
  it('meets two forward rays', () => {
    const p = rayIntersection({ x: 0, y: 0 }, 45, { x: 2, y: 0 }, 135)
    expect(p?.x).toBeCloseTo(1, 12)
    expect(p?.y).toBeCloseTo(1, 12)
  })

  it('returns null for parallel rays and for crossings behind either origin', () => {
    expect(rayIntersection({ x: 0, y: 0 }, 30, { x: 1, y: 0 }, 30)).toBeNull()
    expect(rayIntersection({ x: 0, y: 0 }, 45, { x: 2, y: 0 }, 45 + 90)).not.toBeNull()
    expect(rayIntersection({ x: 0, y: 0 }, 45, { x: -2, y: 0 }, 135)).toBeNull()
  })
})

describe('inletGeometry: default example', () => {
  const g = geometry(3, DEFAULT_RAMPS)

  it('places corners along the cumulative wall angles', () => {
    expect(g.corners).toHaveLength(4)
    expect(g.corners[0]).toEqual({ x: 0, y: 0 })
    expect(g.corners[3]!.x).toBeCloseTo(1.932, 3)
    expect(g.corners[3]!.y).toBeCloseTo(0.467, 3)
  })

  it('starts each shock at its ramp corner at (wall angle before the ramp) + β', () => {
    expect(g.shocks.map((s) => s.angleDeg)).toEqual([
      expect.closeTo(25.61, 2),
      expect.closeTo(36.94, 2),
      expect.closeTo(48.97, 2),
    ])
    g.shocks.forEach((s, i) => expect(s.from).toEqual(g.corners[i]))
  })

  it('opens clean: the shocks cross only past the end of the ramps', () => {
    expect(g.conflict).toBeNull()
  })

  it('draws one closed region per chain region, all finite', () => {
    expect(g.regions.map((r) => r.index)).toEqual([1, 2, 3, 4])
    for (const r of g.regions) expect(r.polygon.length).toBeGreaterThanOrEqual(3)
    expect(allFinite(g)).toBe(true)
    expect(g.detachedCorner).toBeNull()
  })

  it('puts every shock exit on the top or right edge of the drawn area', () => {
    for (const s of g.shocks) {
      const onRight = Math.abs(s.to.x - g.bounds.x1) < 1e-9 && s.to.y <= g.bounds.y1 + 1e-9
      const onTop = Math.abs(s.to.y - g.bounds.y1) < 1e-9 && s.to.x <= g.bounds.x1 + 1e-9
      expect(onRight || onTop).toBe(true)
    }
  })
})

describe('inletGeometry: conflicts', () => {
  it('flags shocks 1 and 2 crossing inside the drawn area when the ramps are long', () => {
    const g = geometry(3, ramps([8, 8, 8], [1, 1, 1]))
    expect(g.conflict).toMatchObject({ kind: 'shocks', between: [1, 2] })
    expect(g.conflict?.at.x).toBeCloseTo(2.22, 2)
    expect(g.conflict!.at.x).toBeLessThan(g.bounds.x1)
  })

  it('flags a steep, long last ramp that runs into an earlier shock', () => {
    const g = geometry(3, ramps([5, 5, 25], [1, 1, 3]))
    expect(g.conflict).not.toBeNull()
    expect(g.conflict!.at.x).toBeLessThan(g.bounds.x1)
  })

  it('stays finite for θ = 0 and very long ramps (Review Focus 4)', () => {
    expect(allFinite(geometry(3, ramps([0, 8, 8], [1, 0.6, 0.4])))).toBe(true)
    expect(allFinite(geometry(3, ramps([8, 8, 8], [1, 0.6, 10])))).toBe(true)
  })
})

describe('inletGeometry: detachment', () => {
  it('draws no shock for the detached ramp and stops the regions there', () => {
    const g = geometry(2, ramps([15, 15, 15], [1, 1, 1]))
    expect(g.shocks).toHaveLength(1)
    expect(g.regions.map((r) => r.index)).toEqual([1, 2])
    expect(g.detachedCorner).toEqual(g.corners[1])
    expect(allFinite(g)).toBe(true)
  })

  it('covers the whole field with region 1 when the first ramp detaches', () => {
    const g = geometry(1.5, ramps([20], [1]))
    expect(g.shocks).toHaveLength(0)
    expect(g.regions.map((r) => r.index)).toEqual([1])
    expect(g.detachedCorner).toEqual({ x: 0, y: 0 })
    expect(allFinite(g)).toBe(true)
  })
})
