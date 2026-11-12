import { describe, expect, it } from 'vitest'
import { normalShock } from '../normalShock'
import {
  maxDeflection,
  obliqueFromBeta,
  obliqueFromM1n,
  obliqueFromTheta,
  thetaFromBetaDeg,
  type ObliqueFromTheta,
} from '../obliqueShock'
import type { Result } from '../result'
import { expectBounds, expectError, expectRel, unwrap } from './helpers'

const DEG_TOL = 1e-4

function attached(r: Result<ObliqueFromTheta>) {
  const v = unwrap(r)
  if (v.kind !== 'attached') throw new Error('expected an attached shock')
  return v
}

describe('obliqueFromTheta', () => {
  it('M1 = 2, θ = 10°: weak 39.3139°, strong 83.7001°', () => {
    const { weak, strong } = attached(obliqueFromTheta(2, 10, 1.4))
    expect(weak.betaDeg).toBeCloseTo(39.3139, 4)
    expect(Math.abs(strong.betaDeg - 83.7001)).toBeLessThan(DEG_TOL)
    expectRel(weak.m1n, 2 * Math.sin((weak.betaDeg * Math.PI) / 180), 1e-12)
    expectRel(weak.p2P1, 1.7066, 1e-4)
    expect(weak.m1).toBe(2)
    expect(weak.thetaDeg).toBeCloseTo(10, 9)
  })

  it('weak solution is supersonic downstream, strong is subsonic', () => {
    const { weak, strong } = attached(obliqueFromTheta(2, 10, 1.4))
    expect(weak.m2).toBeGreaterThan(1)
    expect(strong.m2).toBeLessThan(1)
    expectRel(weak.m2, 1.6405, 1e-4)
  })

  it('M1 = 3, θ = 20°: weak 37.7636°', () => {
    const { weak } = attached(obliqueFromTheta(3, 20, 1.4))
    expect(Math.abs(weak.betaDeg - 37.7636)).toBeLessThan(DEG_TOL)
  })

  it('detaches above θmax', () => {
    const r = unwrap(obliqueFromTheta(2, 23, 1.4))
    expect(r.kind).toBe('detached')
    expect(Math.abs(r.max.thetaMaxDeg - 22.9735)).toBeLessThan(DEG_TOL)
  })

  it('weak and strong coincide at θ = θmax', () => {
    const max = unwrap(maxDeflection(2, 1.4))
    const { weak, strong } = attached(obliqueFromTheta(2, max.thetaMaxDeg, 1.4))
    expect(weak.betaDeg).toBe(strong.betaDeg)
    expect(weak.betaDeg).toBe(max.betaDeg)
  })

  it('θ = 0: weak is the Mach wave, strong is a normal shock', () => {
    const { weak, strong } = attached(obliqueFromTheta(2, 0, 1.4))
    expect(weak.betaDeg).toBeCloseTo(30, 12)
    expect(weak.p2P1).toBeCloseTo(1, 12)
    expect(weak.m2).toBeCloseTo(2, 12)
    expect(strong.betaDeg).toBe(90)
    expectRel(strong.p2P1, unwrap(normalShock(2, 1.4)).p2P1, 1e-12)
  })

  it('rejects negative θ, M1 ≤ 1, bad γ and NaN', () => {
    expectError(obliqueFromTheta(2, -1, 1.4), 'OUT_OF_RANGE')
    expectError(obliqueFromTheta(1, 5, 1.4), 'OUT_OF_RANGE')
    expectError(obliqueFromTheta(0.9, 5, 1.4), 'OUT_OF_RANGE')
    expectError(obliqueFromTheta(2, 5, 1), 'INVALID_GAMMA')
    expectError(obliqueFromTheta(2, NaN, 1.4), 'NOT_FINITE')
  })
})

describe('maxDeflection', () => {
  it('M1 = 2: θmax 22.9735° at β 64.6690°', () => {
    const m = unwrap(maxDeflection(2, 1.4))
    expect(Math.abs(m.thetaMaxDeg - 22.9735)).toBeLessThan(DEG_TOL)
    expect(Math.abs(m.betaDeg - 64.669)).toBeLessThan(DEG_TOL)
  })

  it('is the peak of the θ-β curve', () => {
    const m = unwrap(maxDeflection(3, 1.4))
    expect(thetaFromBetaDeg(3, m.betaDeg - 0.01, 1.4)).toBeLessThan(m.thetaMaxDeg)
    expect(thetaFromBetaDeg(3, m.betaDeg + 0.01, 1.4)).toBeLessThan(m.thetaMaxDeg)
  })

  it('rejects M1 = 1 and bad γ', () => {
    expectError(maxDeflection(1, 1.4), 'OUT_OF_RANGE')
    expectError(maxDeflection(2, 0.5), 'INVALID_GAMMA')
  })
})

describe('thetaFromBetaDeg', () => {
  it('is zero at the Mach angle and at 90°, and never negative', () => {
    expect(thetaFromBetaDeg(2, 90, 1.4)).toBe(0)
    expect(thetaFromBetaDeg(2, 30, 1.4)).toBeCloseTo(0, 12)
    expect(thetaFromBetaDeg(2, 20, 1.4)).toBe(0)
  })
})

describe('obliqueFromBeta and obliqueFromM1n', () => {
  it('β = 90° is a normal shock', () => {
    const s = unwrap(obliqueFromBeta(2, 90, 1.4))
    const n = unwrap(normalShock(2, 1.4))
    expect(s.thetaDeg).toBe(0)
    expectRel(s.p2P1, n.p2P1, 1e-12)
    expectRel(s.rho2Rho1, n.rho2Rho1, 1e-12)
    expectRel(s.t2T1, n.t2T1, 1e-12)
    expectRel(s.p02P01, n.p02P01, 1e-12)
    expectRel(s.m2, n.m2, 1e-12)
    expectRel(s.m2n, n.m2, 1e-12)
  })

  it('β = μ is a Mach wave (no change)', () => {
    const s = unwrap(obliqueFromBeta(2, 30, 1.4))
    expect(s.thetaDeg).toBeCloseTo(0, 12)
    expect(s.m1n).toBeCloseTo(1, 12)
  })

  it('M1n recovers β', () => {
    expect(Math.abs(unwrap(obliqueFromM1n(2, 1.2671, 1.4)).betaDeg - 39.31)).toBeLessThan(0.01)
  })

  it('M1n = 1 and M1n = M1 hit the range ends', () => {
    expect(unwrap(obliqueFromM1n(2, 1, 1.4)).thetaDeg).toBeCloseTo(0, 12)
    expect(unwrap(obliqueFromM1n(2, 2, 1.4)).betaDeg).toBe(90)
  })

  it('rejects β below μ with bounds [μ, 90]', () => {
    const r = obliqueFromBeta(2, 25, 1.4)
    expectError(r, 'OUT_OF_RANGE')
    expectBounds(r, [30, 90])
  })

  it.each([
    ['β > 90', () => obliqueFromBeta(2, 91, 1.4)],
    ['M1n > M1', () => obliqueFromM1n(2, 2.5, 1.4)],
    ['M1n < 1', () => obliqueFromM1n(2, 0.9, 1.4)],
    ['M1 = 1 (β)', () => obliqueFromBeta(1, 90, 1.4)],
    ['M1 = 1 (M1n)', () => obliqueFromM1n(1, 1, 1.4)],
  ])('rejects %s', (_name, solve) => {
    expectError(solve(), 'OUT_OF_RANGE')
  })

  it('rejects bad γ', () => {
    expectError(obliqueFromBeta(2, 40, 1), 'INVALID_GAMMA')
    expectError(obliqueFromM1n(2, 1.5, 1), 'INVALID_GAMMA')
  })
})

describe('round trips through the θ-β-M relation', () => {
  const cases = [1.2, 2, 5, 10].flatMap((m) => [0.1, 0.5, 0.99].map((f) => [m, f] as const))

  it.each(cases)('M1 = %d at %d·θmax', (m, frac) => {
    const theta = unwrap(maxDeflection(m, 1.4)).thetaMaxDeg * frac
    const { weak, strong } = attached(obliqueFromTheta(m, theta, 1.4))
    expect(Math.abs(thetaFromBetaDeg(m, weak.betaDeg, 1.4) - theta)).toBeLessThan(1e-9)
    expect(Math.abs(thetaFromBetaDeg(m, strong.betaDeg, 1.4) - theta)).toBeLessThan(1e-9)
    expect(weak.betaDeg).toBeLessThan(strong.betaDeg)
  })
})

describe('review focus', () => {
  it.each([
    [50, 10],
    [20, 30],
  ])('hypersonic M1 = %d, θ = %d° stays attached and round-trips', (m, theta) => {
    const { weak } = attached(obliqueFromTheta(m, theta, 1.4))
    expect(Math.abs(thetaFromBetaDeg(m, weak.betaDeg, 1.4) - theta)).toBeLessThan(1e-9)
  })

  it.each([2, 5])('M1 = %d just below θmax brackets β_max', (m) => {
    const max = unwrap(maxDeflection(m, 1.4))
    const theta = max.thetaMaxDeg - 1e-6
    const { weak, strong } = attached(obliqueFromTheta(m, theta, 1.4))
    expect(weak.betaDeg).toBeLessThanOrEqual(max.betaDeg)
    expect(strong.betaDeg).toBeGreaterThanOrEqual(max.betaDeg)
    expect(Math.abs(thetaFromBetaDeg(m, weak.betaDeg, 1.4) - theta)).toBeLessThan(1e-6)
    expect(Math.abs(thetaFromBetaDeg(m, strong.betaDeg, 1.4) - theta)).toBeLessThan(1e-6)
  })
})
