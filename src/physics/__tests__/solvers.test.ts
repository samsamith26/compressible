import { describe, expect, it } from 'vitest'
import { isentropicFromMach, type IsentropicState } from '../isentropic'
import { normalShock, type NormalShockState } from '../normalShock'
import { obliqueFromTheta, type ObliqueShockState } from '../obliqueShock'
import {
  solveIsentropic,
  solveNormalShock,
  solveOblique,
  type IsentropicInputKind,
  type NormalShockInputKind,
  type ObliqueInputKind,
} from '../solvers'
import * as api from '../index'
import { expectBounds, expectError, expectRel, unwrap } from './helpers'

function expectSameState<T extends object>(actual: T, expected: T, rel = 1e-9): void {
  for (const [key, value] of Object.entries(expected)) {
    const got: unknown = Reflect.get(actual, key)
    if (typeof value === 'number' && typeof got === 'number') expectRel(got, value, rel)
    else expect(got, key).toEqual(value)
  }
}

describe('solveIsentropic', () => {
  const g = 1.4
  const s: IsentropicState = unwrap(isentropicFromMach(2, g))
  const sub: IsentropicState = unwrap(isentropicFromMach(0.5, g))
  const inputs: ReadonlyArray<[IsentropicInputKind, number, IsentropicState]> = [
    ['mach', 2, s],
    ['tT0', s.tT0, s],
    ['pP0', s.pP0, s],
    ['rhoRho0', s.rhoRho0, s],
    ['areaSub', sub.aAStar, sub],
    ['areaSup', s.aAStar, s],
    ['machAngleDeg', s.machAngleDeg ?? NaN, s],
    ['prandtlMeyerDeg', s.prandtlMeyerDeg ?? NaN, s],
  ]

  it.each(inputs)('from %s reproduces the forward state', (kind, value, expected) => {
    expectSameState(unwrap(solveIsentropic({ kind, value }, g)), expected)
  })

  it('passes inner errors through unchanged', () => {
    const r = solveIsentropic({ kind: 'pP0', value: 2 }, g)
    expectError(r, 'OUT_OF_RANGE')
    expectBounds(r, [0, 1])
  })

  it('validates γ even for the γ-free Mach-angle input', () => {
    expectError(solveIsentropic({ kind: 'machAngleDeg', value: 30 }, 1), 'INVALID_GAMMA')
  })
})

describe('solveNormalShock', () => {
  const g = 1.4
  const s: NormalShockState = unwrap(normalShock(2, g))
  const inputs: ReadonlyArray<[NormalShockInputKind, number]> = [
    ['m1', 2],
    ['m2', s.m2],
    ['p2P1', s.p2P1],
    ['rho2Rho1', s.rho2Rho1],
    ['t2T1', s.t2T1],
    ['p02P01', s.p02P01],
    ['p1P02', s.p1P02],
  ]

  it.each(inputs)('from %s reproduces the M1 = 2 state', (kind, value) => {
    expectSameState(unwrap(solveNormalShock({ kind, value }, g)), s)
  })

  it('passes inner errors through unchanged', () => {
    expectError(solveNormalShock({ kind: 'm2', value: 0.1 }, g), 'OUT_OF_RANGE')
  })
})

describe('solveOblique', () => {
  const g = 1.4
  const ref = obliqueFromTheta(2, 10, g)
  const both = unwrap(ref)
  if (both.kind !== 'attached') throw new Error('fixture must be attached')
  const inputs: ReadonlyArray<[ObliqueInputKind, number, ObliqueShockState]> = [
    ['thetaWeak', 10, both.weak],
    ['thetaStrong', 10, both.strong],
    ['beta', both.weak.betaDeg, both.weak],
    ['m1n', both.weak.m1n, both.weak],
  ]

  it.each(inputs)('from %s reproduces the M1 = 2, θ = 10° state', (kind, value, expected) => {
    const r = unwrap(solveOblique(2, { kind, value }, g))
    if (r.kind !== 'attached') throw new Error('expected attached')
    expectSameState(r.state, expected)
    expectSameState(r.max, both.max)
  })

  it('reports detachment for θ above θmax', () => {
    const r = unwrap(solveOblique(2, { kind: 'thetaWeak', value: 30 }, g))
    expect(r.kind).toBe('detached')
    expectRel(r.max.thetaMaxDeg, both.max.thetaMaxDeg, 1e-12)
  })

  it('passes inner errors through unchanged', () => {
    expectError(solveOblique(2, { kind: 'beta', value: 10 }, g), 'OUT_OF_RANGE')
    expectError(solveOblique(0.5, { kind: 'm1n', value: 1 }, g), 'OUT_OF_RANGE')
    expectError(solveOblique(2, { kind: 'thetaStrong', value: -5 }, g), 'OUT_OF_RANGE')
  })
})

describe('public index', () => {
  it('exports the solvers and forward relations but not numeric internals', () => {
    expect(typeof api.solveIsentropic).toBe('function')
    expect(typeof api.solveNormalShock).toBe('function')
    expect(typeof api.solveOblique).toBe('function')
    expect(typeof api.isentropicFromMach).toBe('function')
    expect(typeof api.thetaFromBetaDeg).toBe('function')
    expect(typeof api.areaRatio).toBe('function')
    expect(typeof api.ok).toBe('function')
    expect('findRoot' in api).toBe(false)
    expect('validateGamma' in api).toBe(false)
    expect('normalShockRaw' in api).toBe(false)
  })
})
