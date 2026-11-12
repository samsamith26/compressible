import { describe, expect, it } from 'vitest'
import {
  m1FromM2,
  m1FromP02P01,
  m1FromP1P02,
  m1FromP2P1,
  m1FromRho2Rho1,
  m1FromT2T1,
  normalShock,
} from '../normalShock'
import { expectBounds, expectError, expectRel, unwrap } from './helpers'

describe('normalShock', () => {
  it('matches Anderson tables at M1 = 2, γ = 1.4', () => {
    const s = unwrap(normalShock(2, 1.4))
    expect(s.m1).toBe(2)
    expectRel(s.m2, 0.57735)
    expectRel(s.p2P1, 4.5)
    expectRel(s.rho2Rho1, 2.666667)
    expectRel(s.t2T1, 1.6875)
    expectRel(s.p02P01, 0.720874)
    expectRel(s.p1P02, 0.177291)
  })

  it('is the identity at M1 = 1', () => {
    const s = unwrap(normalShock(1, 1.4))
    for (const v of [s.m2, s.p2P1, s.rho2Rho1, s.t2T1, s.p02P01]) expectRel(v, 1, 1e-12)
    expectRel(s.p1P02, 0.528282)
  })

  it('rejects subsonic M1, invalid γ and NaN', () => {
    expectError(normalShock(0.8, 1.4), 'OUT_OF_RANGE')
    expectError(normalShock(2, 1), 'INVALID_GAMMA')
    expectError(normalShock(NaN, 1.4), 'NOT_FINITE')
  })
})

describe('inverse solvers round-trip', () => {
  const gammas = [1.1, 1.3, 1.4, 1.67]
  const machs = [1.001, 1.2, 2, 5, 10, 50]
  const cases = gammas.flatMap((g) => machs.map((m) => [g, m] as const))

  it.each(cases)('γ = %d, M1 = %d', (g, m) => {
    const s = unwrap(normalShock(m, g))
    expectRel(unwrap(m1FromM2(s.m2, g)), m, 1e-9)
    expectRel(unwrap(m1FromP2P1(s.p2P1, g)), m, 1e-9)
    expectRel(unwrap(m1FromRho2Rho1(s.rho2Rho1, g)), m, 1e-9)
    expectRel(unwrap(m1FromT2T1(s.t2T1, g)), m, 1e-9)
    expectRel(unwrap(m1FromP02P01(s.p02P01, g)), m, 1e-9)
    expectRel(unwrap(m1FromP1P02(s.p1P02, g)), m, 1e-9)
  })

  it('every inverse returns M1 = 1 at its sonic end', () => {
    const s = unwrap(normalShock(1, 1.4))
    expect(unwrap(m1FromM2(1, 1.4))).toBeCloseTo(1, 12)
    expect(unwrap(m1FromP2P1(1, 1.4))).toBeCloseTo(1, 12)
    expect(unwrap(m1FromRho2Rho1(1, 1.4))).toBeCloseTo(1, 12)
    expect(unwrap(m1FromT2T1(1, 1.4))).toBeCloseTo(1, 12)
    expect(unwrap(m1FromP02P01(1, 1.4))).toBeCloseTo(1, 12)
    expect(unwrap(m1FromP1P02(s.p1P02, 1.4))).toBeCloseTo(1, 12)
  })
})

describe('inverse solver validation', () => {
  it('M2 below its asymptotic minimum is out of range', () => {
    const r = m1FromM2(0.3, 1.4)
    expectError(r, 'OUT_OF_RANGE')
    expectBounds(r, [0.377964, 1])
  })

  it('ρ2/ρ1 at its (γ+1)/(γ−1) limit is out of range', () => {
    const r = m1FromRho2Rho1(6, 1.4)
    expectError(r, 'OUT_OF_RANGE')
    expectBounds(r, [1, 6])
    expect(!r.ok && r.error.message).toBe('ρ2/ρ1 must be between 1 and 6')
  })

  it.each([
    ['M2 > 1', () => m1FromM2(1.1, 1.4)],
    ['p2/p1 < 1', () => m1FromP2P1(0.9, 1.4)],
    ['T2/T1 < 1', () => m1FromT2T1(0.5, 1.4)],
    ['p02/p01 > 1', () => m1FromP02P01(1.1, 1.4)],
    ['p02/p01 = 0', () => m1FromP02P01(0, 1.4)],
    ['p1/p02 above max', () => m1FromP1P02(0.6, 1.4)],
    ['p1/p02 = 0', () => m1FromP1P02(0, 1.4)],
  ])('rejects %s', (_name, solve) => {
    expectError(solve(), 'OUT_OF_RANGE')
  })

  it('p1/p02 bound is (2/(γ+1))^(γ/(γ−1))', () => {
    expectBounds(m1FromP1P02(0.6, 1.4), [0, 0.528282])
  })

  it.each([
    () => m1FromM2(0.5, 1),
    () => m1FromP2P1(2, 0.9),
    () => m1FromRho2Rho1(2, NaN),
    () => m1FromT2T1(2, 1),
    () => m1FromP02P01(0.5, 1),
    () => m1FromP1P02(0.2, 1),
  ])('rejects invalid γ (case %#)', (solve) => {
    const r = solve()
    expect(r.ok ? 'ok' : r.error.code).toMatch(/^(INVALID_GAMMA|NOT_FINITE)$/)
  })
})

describe('review focus', () => {
  it('γ = 1.01 at M1 = 10 round-trips every inverse', () => {
    const g = 1.01
    const s = unwrap(normalShock(10, g))
    for (const m of [
      m1FromM2(s.m2, g),
      m1FromP2P1(s.p2P1, g),
      m1FromRho2Rho1(s.rho2Rho1, g),
      m1FromT2T1(s.t2T1, g),
      m1FromP02P01(s.p02P01, g),
      m1FromP1P02(s.p1P02, g),
    ]) {
      expectRel(unwrap(m), 10, 1e-8)
    }
  })

  it('reports NO_BRACKET for ratios beyond the M1 search range', () => {
    expectError(m1FromP02P01(1e-300, 1.4), 'NO_BRACKET')
    expectError(m1FromP1P02(1e-300, 1.4), 'NO_BRACKET')
  })

  it('p1/p02 at its maximum gives M1 = 1', () => {
    expect(unwrap(m1FromP1P02(unwrap(normalShock(1, 1.4)).p1P02, 1.4))).toBeCloseTo(1, 12)
  })
})
