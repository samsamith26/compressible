import { describe, expect, it } from 'vitest'
import { maxDeflection } from '@/physics'
import { machCurve, nearestIndex, thetaAxisMax, thetaMaxLocus } from '../thetaBeta'

describe('machCurve', () => {
  const curve = machCurve(2, 1.4, 100)
  it('runs from the Mach angle to 90° with θ = 0 at both ends', () => {
    expect(curve[0]?.betaDeg).toBeCloseTo(30, 10)
    expect(curve.at(-1)?.betaDeg).toBeCloseTo(90, 10)
    expect(curve[0]?.thetaDeg).toBeCloseTo(0, 6)
    expect(curve.at(-1)?.thetaDeg).toBe(0)
  })
  it('peaks at θmax', () => {
    const peak = Math.max(...curve.map((p) => p.thetaDeg))
    const max = maxDeflection(2, 1.4)
    expect(max.ok && peak).toBeCloseTo(max.ok ? max.value.thetaMaxDeg : 0, 1)
  })
  it('is monotone in β', () => {
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]?.betaDeg ?? 0).toBeGreaterThan(curve[i - 1]?.betaDeg ?? 0)
    }
  })
})

describe('thetaMaxLocus', () => {
  it('rises from (0°, 90°) near M = 1 towards the M → ∞ limit', () => {
    const locus = thetaMaxLocus(1.4)
    expect(locus[0]?.thetaDeg).toBeLessThan(0.1)
    expect(locus[0]?.betaDeg).toBeGreaterThan(85)
    expect(locus.at(-1)?.thetaDeg).toBeCloseTo(45.58, 1)
  })
})

describe('thetaAxisMax', () => {
  it('rounds the M → ∞ deflection up to 5°', () => {
    expect(thetaAxisMax(1.4)).toBe(50)
    expect(thetaAxisMax(1.1)).toBeGreaterThan(60)
  })
})

describe('nearestIndex', () => {
  it('finds the closest point', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 5 },
    ]
    expect(nearestIndex(pts, { x: 18, y: 3 })).toBe(2)
    expect(nearestIndex(pts, { x: -4, y: 1 })).toBe(0)
  })
})
