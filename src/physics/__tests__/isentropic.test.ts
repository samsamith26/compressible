import { describe, expect, it } from 'vitest'
import {
  areaRatio,
  isentropicFromMach,
  machFromAreaRatio,
  machFromMachAngle,
  machFromPP0,
  machFromPrandtlMeyer,
  machFromRhoRho0,
  machFromTT0,
  maxPrandtlMeyerDeg,
  prandtlMeyerDeg,
} from '../isentropic'
import { expectBounds, expectError, expectRel, unwrap } from './helpers'

describe('isentropicFromMach', () => {
  it('matches Anderson tables at M = 2, γ = 1.4', () => {
    const s = unwrap(isentropicFromMach(2, 1.4))
    expect(s.mach).toBe(2)
    expectRel(s.tT0, 0.555556)
    expectRel(s.pP0, 0.127805)
    expectRel(s.rhoRho0, 0.230048)
    expectRel(s.aAStar, 1.6875)
    expectRel(s.machAngleDeg ?? NaN, 30, 1e-12)
    expectRel(s.prandtlMeyerDeg ?? NaN, 26.3798)
    expectRel(s.tTStar, 0.666667)
    expectRel(s.pPStar, 0.241925)
    expectRel(s.rhoRhoStar, 0.362887)
  })

  it('handles γ = 1.3', () => {
    const s = unwrap(isentropicFromMach(2, 1.3))
    expectRel(s.tT0, 0.625)
    expectRel(s.pP0, 0.130461)
  })

  it('gives null Mach and P-M angles for subsonic flow', () => {
    const s = unwrap(isentropicFromMach(0.5, 1.4))
    expectRel(s.aAStar, 1.33984)
    expect(s.machAngleDeg).toBeNull()
    expect(s.prandtlMeyerDeg).toBeNull()
  })

  it('is sonic at M = 1', () => {
    const s = unwrap(isentropicFromMach(1, 1.4))
    expectRel(s.aAStar, 1, 1e-12)
    expectRel(s.machAngleDeg ?? NaN, 90, 1e-12)
    expect(s.prandtlMeyerDeg).toBe(0)
    expectRel(s.tTStar, 1, 1e-12)
    expectRel(s.pPStar, 1, 1e-12)
    expectRel(s.rhoRhoStar, 1, 1e-12)
  })

  it.each([0, -1])('rejects M = %d', (m) => {
    expectError(isentropicFromMach(m, 1.4), 'OUT_OF_RANGE')
  })

  it('rejects invalid γ and non-finite M', () => {
    expectError(isentropicFromMach(2, 1), 'INVALID_GAMMA')
    expectError(isentropicFromMach(NaN, 1.4), 'NOT_FINITE')
  })
})

describe('raw relations', () => {
  it('maxPrandtlMeyerDeg(1.4) = 130.454', () => {
    expectRel(maxPrandtlMeyerDeg(1.4), 130.454)
  })

  it('areaRatio and prandtlMeyerDeg agree with the state', () => {
    expect(areaRatio(2, 1.4)).toBeCloseTo(1.6875, 12)
    expectRel(prandtlMeyerDeg(2, 1.4), 26.3798)
  })
})

describe('inverse solvers round-trip', () => {
  const gammas = [1.1, 1.3, 1.4, 1.67]
  const machs = [0.05, 0.3, 0.7, 0.99, 1.01, 1.5, 3, 8, 20]
  const cases = gammas.flatMap((g) => machs.map((m) => [g, m] as const))

  it.each(cases)('γ = %d, M = %d', (g, m) => {
    const s = unwrap(isentropicFromMach(m, g))
    expectRel(unwrap(machFromTT0(s.tT0, g)), m, 1e-9)
    expectRel(unwrap(machFromPP0(s.pP0, g)), m, 1e-9)
    expectRel(unwrap(machFromRhoRho0(s.rhoRho0, g)), m, 1e-9)
    const branch = m < 1 ? 'subsonic' : 'supersonic'
    expectRel(unwrap(machFromAreaRatio(s.aAStar, g, branch)), m, 1e-9)
    if (m >= 1) {
      expectRel(unwrap(machFromMachAngle(s.machAngleDeg ?? NaN)), m, 1e-9)
      expectRel(unwrap(machFromPrandtlMeyer(s.prandtlMeyerDeg ?? NaN, g)), m, 1e-9)
    }
  })
})

describe('inverse solver validation', () => {
  it('rejects p/p0 outside (0, 1) with bounds', () => {
    const r = machFromPP0(1.2, 1.4)
    expectError(r, 'OUT_OF_RANGE')
    expectBounds(r, [0, 1])
  })

  it.each([
    ['T/T0', () => machFromTT0(0, 1.4)],
    ['ρ/ρ0', () => machFromRhoRho0(1, 1.4)],
    ['A/A*', () => machFromAreaRatio(0.9, 1.4, 'subsonic')],
    ['μ', () => machFromMachAngle(95)],
    ['μ = 0', () => machFromMachAngle(0)],
    ['ν < 0', () => machFromPrandtlMeyer(-1, 1.4)],
  ])('rejects out-of-range %s', (_name, solve) => {
    expectError(solve(), 'OUT_OF_RANGE')
  })

  it('reports A/A* bounds as [1, ∞)', () => {
    expectBounds(machFromAreaRatio(0.5, 1.4, 'supersonic'), [1, Infinity])
  })

  it.each([
    () => machFromTT0(0.5, 1),
    () => machFromPP0(0.5, 0.5),
    () => machFromRhoRho0(0.5, NaN),
    () => machFromAreaRatio(2, 1, 'subsonic'),
    () => machFromPrandtlMeyer(10, 1),
  ])('rejects invalid γ (case %#)', (solve) => {
    expect(solve().ok).toBe(false)
  })

  it('M = 1 from μ = 90°', () => {
    expect(unwrap(machFromMachAngle(90))).toBeCloseTo(1, 14)
  })
})

describe('review focus', () => {
  it('extreme γ: large A/A* near γ = 1 and tiny p/p0 at γ = 3', () => {
    const m1 = unwrap(machFromAreaRatio(1e6, 1.01, 'supersonic'))
    expectRel(areaRatio(m1, 1.01), 1e6, 1e-8)
    const m2 = unwrap(machFromPP0(1e-6, 3.0))
    expectRel(unwrap(isentropicFromMach(m2, 3.0)).pP0, 1e-6, 1e-8)
  })

  it('A/A* just above 1 stays on the requested branch', () => {
    expect(unwrap(machFromAreaRatio(1 + 1e-12, 1.4, 'subsonic'))).toBeLessThanOrEqual(1)
    expect(unwrap(machFromAreaRatio(1 + 1e-12, 1.4, 'supersonic'))).toBeGreaterThanOrEqual(1)
  })

  it('A/A* = 1 is exactly sonic on both branches', () => {
    expect(unwrap(machFromAreaRatio(1, 1.4, 'subsonic'))).toBe(1)
    expect(unwrap(machFromAreaRatio(1, 1.4, 'supersonic'))).toBe(1)
  })

  it('reports NO_BRACKET (not a hang) for ratios beyond the Mach search range', () => {
    expectError(machFromAreaRatio(1e40, 1.4, 'supersonic'), 'NO_BRACKET')
    expectError(machFromAreaRatio(1e40, 1.4, 'subsonic'), 'NO_BRACKET')
    expectError(machFromPrandtlMeyer(maxPrandtlMeyerDeg(1.4) - 1e-7, 1.4), 'NO_BRACKET')
  })

  it('ν = 0 gives M = 1; ν ≥ ν_max is out of range', () => {
    expect(unwrap(machFromPrandtlMeyer(0, 1.4))).toBe(1)
    const atMax = machFromPrandtlMeyer(maxPrandtlMeyerDeg(1.4), 1.4)
    expectError(atMax, 'OUT_OF_RANGE')
    expectBounds(atMax, [0, maxPrandtlMeyerDeg(1.4)])
    expectError(machFromPrandtlMeyer(131, 1.4), 'OUT_OF_RANGE')
  })
})
