import { describe, expect, it } from 'vitest'
import { degToRad, expandUpper, findRoot, radToDeg } from '../numeric'

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

  it('reports NO_BRACKET when the signs match', () => {
    const r = findRoot((x) => x * x + 1, -1, 1)
    expect(!r.ok && r.error.code).toBe('NO_BRACKET')
  })

  it('reports NO_CONVERGENCE when iterations run out', () => {
    const r = findRoot(Math.cos, 0, 3, { maxIter: 1 })
    expect(!r.ok && r.error.code).toBe('NO_CONVERGENCE')
  })
})

describe('expandUpper', () => {
  it('doubles until the sign changes', () => {
    const r = expandUpper((x) => x - 1000, 1, 2, 1e6)
    expect(r.ok && r.value >= 1000).toBe(true)
  })

  it('returns start when it already brackets', () => {
    expect(expandUpper((x) => x - 1.5, 1, 2, 10)).toEqual({ ok: true, value: 2 })
  })

  it('reports NO_BRACKET past the limit', () => {
    const r = expandUpper(() => -1, 0, 1, 1e3)
    expect(!r.ok && r.error.code).toBe('NO_BRACKET')
  })
})

describe('angle conversion', () => {
  it('converts degrees and radians', () => {
    expect(degToRad(180)).toBe(Math.PI)
    expect(radToDeg(Math.PI / 2)).toBe(90)
  })
})
