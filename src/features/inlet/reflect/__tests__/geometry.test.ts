import { describe, expect, it } from 'vitest'
import { heightFromPointer, lengthFromPointer, nudgeReflect, reflectGeometry, thetaFromPointer, type ReflectGeometry } from '../geometry'
import { solveReflect, type ReflectInput } from '../model'

function geometry(input: Partial<ReflectInput>): ReflectGeometry {
  const r = solveReflect({ m1: 3, thetaDeg: 10, height: 1, length: 5, ...input }, 1.4)
  if (!r.ok) throw new Error(r.error.message)
  return reflectGeometry(r.value)
}

function inside(g: ReflectGeometry): boolean {
  const eps = 1e-9
  return g.regions.every((r) =>
    r.polygon.every((p) => p.x >= g.bounds.x0 - eps && p.x <= g.bounds.x1 + eps && p.y >= -eps && p.y <= g.bounds.y1 + eps),
  )
}

describe('reflectGeometry: default', () => {
  const g = geometry({})

  it('draws the ramp from the lead-in and the cowl from x = 0 to the channel end', () => {
    expect(g.bounds).toEqual({ x0: -0.3, x1: 5, y1: 1.15 })
    expect(g.lowerWall).toEqual([{ x: -0.3, y: 0 }, { x: 0, y: 0 }, { x: 5, y: expect.closeTo(5 * Math.tan(Math.PI / 18), 12) }])
    expect(g.upperWall).toEqual([{ x: 0, y: 1 }, { x: 5, y: 1 }])
  })

  it('has one region per chain region, each a closed polygon inside the drawing', () => {
    expect(g.regions.map((r) => r.index)).toEqual([1, 2, 3, 4, 5])
    for (const r of g.regions) expect(r.polygon.length).toBeGreaterThanOrEqual(3)
    expect(inside(g)).toBe(true)
  })

  it('labels each shock with its angle to the wall it leaves', () => {
    expect(g.shocks.map((s) => s.label)).toEqual(['17.4° to ramp', '21.8° to cowl', '27.6° to ramp', '36.4° to cowl'])
  })

  it('marks the failed reflection', () => {
    expect(g.stop?.text).toBe('Mach reflection (not modeled)')
    expect(g.stop?.at.x).toBeCloseTo(4.056, 3)
  })
})

describe('reflectGeometry: other cases', () => {
  it('labels the 2.8/16 reflected shock 29.3° to the cowl', () => {
    expect(geometry({ m1: 2.8, thetaDeg: 16 }).shocks[1]?.label).toBe('29.3° to cowl')
  })

  it('closes the last region at the channel end when a shock leaves', () => {
    const g = geometry({ length: 2.5 })
    expect(g.stop).toBeNull()
    expect(g.regions).toHaveLength(3)
    expect(g.regions.slice(1).every((r) => r.polygon.some((p) => Math.abs(p.x - 2.5) < 1e-9))).toBe(true)
    expect(inside(g)).toBe(true)
  })

  it('ends the drawing where the walls meet', () => {
    const g = geometry({ m1: 10, thetaDeg: 5, length: 20 })
    expect(g.bounds.x1).toBeCloseTo(1 / Math.tan((5 * Math.PI) / 180), 9)
    expect(inside(g)).toBe(true)
  })

  it('fills the channel with region 1 behind a leading-edge bow shock', () => {
    const g = geometry({ m1: 1.5, thetaDeg: 15 })
    expect(g.regions).toHaveLength(1)
    expect(g.shocks).toHaveLength(0)
    expect(g.stop).toEqual({ at: { x: 0, y: 0 }, text: 'bow shock' })
  })

  it('handles a shock that leaves before reaching the cowl', () => {
    const g = geometry({ height: 5, length: 1 })
    expect(g.regions).toHaveLength(2)
    expect(inside(g)).toBe(true)
  })
})

describe('handle maths', () => {
  it('reads θ from the pointer angle at the leading edge, clamped to 0.5–40°', () => {
    expect(thetaFromPointer({ x: 1, y: Math.tan(Math.PI / 12) })).toBeCloseTo(15, 9)
    expect(thetaFromPointer({ x: 1, y: -1 })).toBe(0.5)
    expect(thetaFromPointer({ x: 0.1, y: 5 })).toBe(40)
  })

  it('reads H and L from the pointer, clamped', () => {
    expect(heightFromPointer({ x: 3, y: 1.7 })).toBe(1.7)
    expect(heightFromPointer({ x: 3, y: -1 })).toBe(0.05)
    expect(lengthFromPointer({ x: 7.5, y: 0 })).toBe(7.5)
    expect(lengthFromPointer({ x: 50, y: 0 })).toBe(20)
  })

  it('steps each handle with the arrow keys, further with Shift', () => {
    expect(nudgeReflect('theta', 10, 'ArrowUp', false)).toBe(10.5)
    expect(nudgeReflect('theta', 10, 'ArrowDown', true)).toBe(8)
    expect(nudgeReflect('height', 1, 'ArrowUp', false)).toBe(1.05)
    expect(nudgeReflect('length', 5, 'ArrowRight', true)).toBe(5.5)
    expect(nudgeReflect('length', 0.2, 'ArrowLeft', false)).toBe(0.2)
    expect(nudgeReflect('theta', 10, 'Enter', false)).toBeNull()
  })
})
