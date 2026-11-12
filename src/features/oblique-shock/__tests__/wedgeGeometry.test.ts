import { describe, expect, it } from 'vitest'
import { wedgeGeometry } from '../wedgeGeometry'

const numbers = (d: string): number[] => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

describe('wedgeGeometry (attached)', () => {
  const g = wedgeGeometry({ width: 400, height: 200, thetaDeg: 10, betaDeg: 39.31, m1: 2 })

  it('puts the ramp at θ from the apex', () => {
    const [, , ax, ay, ex, ey] = numbers(g.surfacePath)
    expect(Math.atan2((ay ?? 0) - (ey ?? 0), (ex ?? 0) - (ax ?? 0)) * (180 / Math.PI)).toBeCloseTo(10, 0)
  })

  it('turns each streamline on the shock line and then runs parallel to the ramp', () => {
    expect(g.bowShockPath).toBeNull()
    for (const d of g.streamlinePaths) {
      const [, y0, xs, ys, xe, ye] = numbers(d)
      expect(ys).toBe(y0)
      // The kink lies on the shock: angle from the apex is β.
      const beta = Math.atan2(g.apex.y - (ys ?? 0), (xs ?? 0) - g.apex.x) * (180 / Math.PI)
      if ((xs ?? 0) < 400) {
        expect(beta).toBeCloseTo(39.31, 0)
        const turn = Math.atan2((ys ?? 0) - (ye ?? 0), (xe ?? 0) - (xs ?? 0)) * (180 / Math.PI)
        expect(turn).toBeCloseTo(10, 0)
      }
    }
  })

  it('draws arcs from the apex', () => {
    expect(g.arc(40, 10).startsWith(`M${(g.apex.x + 40).toFixed(1)}`)).toBe(true)
  })
})

describe('wedgeGeometry (detached)', () => {
  const g = wedgeGeometry({ width: 400, height: 200, thetaDeg: 30, betaDeg: null, m1: 2 })

  it('draws a bow shock standing off ahead of the apex', () => {
    expect(g.bowShockPath).not.toBeNull()
    const [noseX, noseY] = numbers(g.bowShockPath ?? '')
    expect(noseX ?? Infinity).toBeLessThan(g.apex.x)
    expect(noseY).toBeCloseTo(g.apex.y, 1)
  })

  it('has one streamline per requested line, each meeting the shock', () => {
    expect(g.streamlinePaths).toHaveLength(7)
    for (const d of g.streamlinePaths) expect(d).toMatch(/^M0,[\d.]+ L[\d.]+,[\d.]+ Q/)
  })
})

describe('wedgeGeometry region 2', () => {
  it('is bounded by the shock and the ramp when attached', () => {
    const g = wedgeGeometry({ width: 400, height: 200, thetaDeg: 10, betaDeg: 39.31, m1: 2 })
    expect(g.region2Path).toMatch(/^M144\.0,160\.0 L/)
    expect(wedgeGeometry({ width: 400, height: 200, thetaDeg: 30, betaDeg: null, m1: 2 }).region2Path).toBeNull()
  })
})
