import { describe, expect, it } from 'vitest'
import { pressureRatio } from '@/physics'
import { machAxisMax, ratioCurves } from '../ratioCurves'

describe('machAxisMax', () => {
  it.each([
    [0.5, 4],
    [2, 4],
    [3.6, 10],
    [8, 10],
    [12, 20],
    [5000, 10000],
  ])('M = %d → axis to %d', (m, expected) => {
    expect(machAxisMax(m)).toBe(expected)
  })
})

describe('ratioCurves', () => {
  const c = ratioCurves(1.4, 4, 100)
  it('samples evenly from M = 0.02 to the axis max', () => {
    expect(c.machs).toHaveLength(101)
    expect(c.machs[0]).toBeCloseTo(0.02, 12)
    expect(c.machs.at(-1)).toBeCloseTo(4, 12)
  })
  it('evaluates the isentropic relations', () => {
    expect(c.values.pP0.at(-1)).toBeCloseTo(pressureRatio(4, 1.4), 12)
    expect(c.values.aAStar.at(-1)).toBeCloseTo(10.719, 3)
  })
  it('chooses a log domain that holds the curves at the right edge', () => {
    const [lo, hi] = c.yDomain
    expect(lo).toBeLessThan(c.values.pP0.at(-1) ?? 0)
    expect(hi).toBeGreaterThan(c.values.aAStar.at(-1) ?? 0)
  })
})
