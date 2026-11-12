/**
 * Validates the solvers against values recorded from the Virginia Tech
 * Compressible Aerodynamics Calculator (scripts/record-vt-fixtures.ts).
 *
 * VT's iterative inverses sometimes stop short: it can echo p02/p01 = 0.92199659
 * for an input of 0.922. When VT's echo of the input misses it by more than its
 * display precision, comparing our (exact) inverse with VT's outputs would test
 * VT's convergence, not our physics. In that case we instead check that
 *   1. our forward relations at VT's own solution reproduce VT's outputs, and
 *   2. our inverse reproduces the input itself to 1e-9.
 */

import { describe, expect, it } from 'vitest'
import type { Result } from '../result'
import {
  solveIsentropic,
  solveNormalShock,
  solveOblique,
  type IsentropicInputKind,
  type NormalShockInputKind,
  type ObliqueInputKind,
  type ObliqueSolution,
} from '../solvers'
import isentropicJson from './fixtures/vt-isentropic.json'
import normalJson from './fixtures/vt-normal-shock.json'
import obliqueJson from './fixtures/vt-oblique.json'
import { expectRel, unwrap } from './helpers'

interface VtFixture {
  gamma: number
  m1?: number
  inputKind: string
  inputValue: number
  outputs: Record<string, string> | null
  alert?: string
}

function isFixture(x: unknown): x is VtFixture {
  if (typeof x !== 'object' || x === null) return false
  const outputs: unknown = Reflect.get(x, 'outputs')
  return (
    typeof Reflect.get(x, 'gamma') === 'number' &&
    typeof Reflect.get(x, 'inputKind') === 'string' &&
    typeof Reflect.get(x, 'inputValue') === 'number' &&
    (outputs === null || typeof outputs === 'object')
  )
}

function load(json: unknown): VtFixture[] {
  if (!Array.isArray(json) || !json.every(isFixture)) throw new Error('malformed VT fixture file')
  return json
}

/** One unit in the last displayed place of a VT number (VT truncates to 10 characters). */
function unitInLastPlace(raw: string): number {
  const [mantissa = '', exponent = '0'] = raw.toLowerCase().split('e')
  const decimals = mantissa.includes('.') ? (mantissa.split('.')[1] ?? '').length : 0
  return 10 ** (-decimals + Number(exponent))
}

function numberField(state: object, field: string): number {
  const v: unknown = Reflect.get(state, field)
  if (typeof v !== 'number') throw new Error(`${field}: expected a number, got ${String(v)}`)
  return v
}

function expectMatchesVt(state: object, outputs: Record<string, string>): void {
  for (const [field, raw] of Object.entries(outputs)) {
    if (raw === '') {
      // VT leaves μ and ν blank for subsonic flow, where ours are null.
      expect(Reflect.get(state, field), field).toBeNull()
      continue
    }
    const vt = Number(raw)
    const ours = numberField(state, field)
    const tol = Math.max(2 * unitInLastPlace(raw), 1e-5 * Math.abs(vt))
    expect(Math.abs(ours - vt), `${field}: ours ${ours} vs VT ${raw}`).toBeLessThanOrEqual(tol)
  }
}

interface CaseSpec {
  /** Output field in which VT echoes the input quantity. */
  echoField: string
  /** Our inverse solve from the fixture input. */
  solve: () => Result<object>
  /** Our forward solve at VT's displayed solution (used when VT did not converge). */
  solveAtVtSolution: (outputs: Record<string, string>) => Result<object>
}

function checkCase(f: VtFixture, spec: CaseSpec): void {
  const r = spec.solve()
  if (f.outputs === null) {
    expect(r.ok, `VT rejected with "${f.alert ?? ''}" but we accepted`).toBe(false)
    return
  }
  const ours = unwrap(r)
  const echo = f.outputs[spec.echoField] ?? ''
  const vtConverged = Math.abs(Number(echo) - f.inputValue) <= 2 * unitInLastPlace(echo)
  if (vtConverged) {
    expectMatchesVt(ours, f.outputs)
  } else {
    expectMatchesVt(unwrap(spec.solveAtVtSolution(f.outputs)), f.outputs)
    expectRel(numberField(ours, spec.echoField), f.inputValue, 1e-9)
  }
}

function kindOf<K extends string>(kinds: readonly K[], raw: string): K {
  const k = kinds.find((x) => x === raw)
  if (k === undefined) throw new Error(`unknown input kind ${raw}`)
  return k
}

function label(f: VtFixture): string {
  return `γ=${f.gamma} ${f.m1 === undefined ? '' : `M1=${f.m1} `}${f.inputKind}=${f.inputValue}`
}

function cases(fixtures: VtFixture[]): Array<readonly [string, VtFixture]> {
  return fixtures.map((f) => [label(f), f] as const)
}

const ISENTROPIC_KINDS: readonly IsentropicInputKind[] = [
  'mach', 'tT0', 'pP0', 'rhoRho0', 'areaSub', 'areaSup', 'machAngleDeg', 'prandtlMeyerDeg',
]
const NORMAL_KINDS: readonly NormalShockInputKind[] = [
  'm1', 'm2', 'p2P1', 'rho2Rho1', 't2T1', 'p02P01', 'p1P02',
]
const OBLIQUE_KINDS: readonly ObliqueInputKind[] = ['thetaWeak', 'thetaStrong', 'beta', 'm1n']
const OBLIQUE_ECHO: Record<ObliqueInputKind, string> = {
  thetaWeak: 'thetaDeg',
  thetaStrong: 'thetaDeg',
  beta: 'betaDeg',
  m1n: 'm1n',
}

/** Attached state as a Result, so detachment counts as "no state". */
function attachedState(r: Result<ObliqueSolution>): Result<object> {
  if (!r.ok) return r
  return r.value.kind === 'attached'
    ? { ok: true, value: r.value.state }
    : { ok: false, error: { code: 'OUT_OF_RANGE', message: 'detached' } }
}

const isentropic = load(isentropicJson)
const normal = load(normalJson)
const oblique = load(obliqueJson)

describe('VT reference: isentropic', () => {
  it('has the full grid', () => expect(isentropic).toHaveLength(96))
  it.each(cases(isentropic))('%s', (_label, f) => {
    const kind = kindOf(ISENTROPIC_KINDS, f.inputKind)
    checkCase(f, {
      echoField: kind === 'areaSub' || kind === 'areaSup' ? 'aAStar' : kind,
      solve: () => solveIsentropic({ kind, value: f.inputValue }, f.gamma),
      solveAtVtSolution: (o) => solveIsentropic({ kind: 'mach', value: Number(o.mach) }, f.gamma),
    })
  })
})

describe('VT reference: normal shock', () => {
  it('has the full grid', () => expect(normal).toHaveLength(84))
  it.each(cases(normal))('%s', (_label, f) => {
    const kind = kindOf(NORMAL_KINDS, f.inputKind)
    checkCase(f, {
      echoField: kind,
      solve: () => solveNormalShock({ kind, value: f.inputValue }, f.gamma),
      solveAtVtSolution: (o) => solveNormalShock({ kind: 'm1', value: Number(o.m1) }, f.gamma),
    })
  })
})

describe('VT reference: oblique shock', () => {
  it('has the full grid', () => expect(oblique).toHaveLength(81))
  it.each(cases(oblique))('%s', (_label, f) => {
    const m1 = f.m1 ?? NaN
    const kind = kindOf(OBLIQUE_KINDS, f.inputKind)
    const solution = solveOblique(m1, { kind, value: f.inputValue }, f.gamma)
    if (f.outputs?.m2 === 'Shock') {
      // VT reports detachment in the output fields ("Shock" / "Detached"), not an alert.
      expect(solution.ok && solution.value.kind).toBe('detached')
      return
    }
    checkCase(f, {
      echoField: OBLIQUE_ECHO[kind],
      solve: () => attachedState(solution),
      solveAtVtSolution: (o) =>
        attachedState(solveOblique(m1, { kind: 'beta', value: Number(o.betaDeg) }, f.gamma)),
    })
  })
})
