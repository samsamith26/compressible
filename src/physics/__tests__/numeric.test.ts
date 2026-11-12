import { describe, expect, it } from 'vitest'
import { degToRad, findRoot, radToDeg } from '../numeric'

function value(r: ReturnType<typeof findRoot>): number {
  if (!r.ok) throw new Error(`expected ok, got ${r.error.code}: ${r.error.message}`)
  return r.value
}

describe('findRoot (Brent)', () => {
  it('finds sqrt(2)', () => {
    expect(value(findRoot((x) => x * x - 2, 0, 2))).toBeCloseTo(Math.SQRT2, 14)
  })

  it('finds pi/2 as the root of cos on [0, 3]', () => {
    expect(value(findRoot(Math.cos, 0, 3))).toBeCloseTo(Math.PI / 2, 14)
  })

  it('returns an endpoint that is exactly a root', () => {
    expect(value(findRoot((x) => x - 1, 1, 5))).toBe(1)
    expect(value(findRoot((x) => x - 5, 1, 5))).toBe(5)
  })

  it('accepts a reversed bracket', () => {
    expect(value(findRoot((x) => x * x - 2, 2, 0))).toBeCloseTo(Math.SQRT2, 14)
  })

  it('handles a steep, badly scaled function', () => {
    // (x - 1e-3)^3 is flat near the root; exercises the bisection fallback
    expect(value(findRoot((x) => (x - 1e-3) ** 3, 0, 10))).toBeCloseTo(1e-3, 4)
  })

  it('compares signs without underflow for tiny function values', () => {
    expect(value(findRoot((x) => (x - 1) * 1e-200, 0, 2))).toBeCloseTo(1, 12)
  })

  it('reports NO_BRACKET when the signs match', () => {
    const r = findRoot((x) => x * x + 1, -1, 1)
    expect(!r.ok && r.error.code).toBe('NO_BRACKET')
  })

  it('reports NO_CONVERGENCE when iterations run out', () => {
    const r = findRoot(Math.cos, 0, 3, { maxIter: 1 })
    expect(!r.ok && r.error.code).toBe('NO_CONVERGENCE')
  })
})

describe('angle conversion', () => {
  it('converts degrees and radians', () => {
    expect(degToRad(180)).toBe(Math.PI)
    expect(radToDeg(Math.PI / 2)).toBe(90)
  })
})
