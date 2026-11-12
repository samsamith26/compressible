/**
 * "Solve from any input" dispatchers: the entry points the UI (and the future
 * nozzle simulator) call. Each maps one known quantity to the full state.
 *
 * Switches have no default: the declared return type makes TypeScript reject
 * any input kind that is added to a union but not handled.
 */

import {
  isentropicFromMach,
  machFromAreaRatio,
  machFromMachAngle,
  machFromPP0,
  machFromPrandtlMeyer,
  machFromRhoRho0,
  machFromTT0,
  type IsentropicState,
} from './isentropic'
import {
  m1FromM2,
  m1FromP02P01,
  m1FromP1P02,
  m1FromP2P1,
  m1FromRho2Rho1,
  m1FromT2T1,
  normalShock,
  type NormalShockState,
} from './normalShock'
import {
  maxDeflection,
  obliqueFromBeta,
  obliqueFromM1n,
  obliqueFromTheta,
  type MaxDeflection,
  type ObliqueShockState,
} from './obliqueShock'
import { ok, type Result } from './result'

export type IsentropicInputKind =
  | 'mach'
  | 'tT0'
  | 'pP0'
  | 'rhoRho0'
  | 'areaSub'
  | 'areaSup'
  | 'machAngleDeg'
  | 'prandtlMeyerDeg'

export type NormalShockInputKind = 'm1' | 'm2' | 'p2P1' | 'rho2Rho1' | 't2T1' | 'p02P01' | 'p1P02'

export type ObliqueInputKind = 'thetaWeak' | 'thetaStrong' | 'beta' | 'm1n'

export interface SolverInput<K extends string> {
  readonly kind: K
  readonly value: number
}

export type ObliqueSolution =
  | { readonly kind: 'attached'; readonly state: ObliqueShockState; readonly max: MaxDeflection }
  | { readonly kind: 'detached'; readonly max: MaxDeflection }

function machFor(input: SolverInput<IsentropicInputKind>, gamma: number): Result<number> {
  const v = input.value
  switch (input.kind) {
    case 'mach':
      return ok(v)
    case 'tT0':
      return machFromTT0(v, gamma)
    case 'pP0':
      return machFromPP0(v, gamma)
    case 'rhoRho0':
      return machFromRhoRho0(v, gamma)
    case 'areaSub':
      return machFromAreaRatio(v, gamma, 'subsonic')
    case 'areaSup':
      return machFromAreaRatio(v, gamma, 'supersonic')
    case 'machAngleDeg':
      return machFromMachAngle(v)
    case 'prandtlMeyerDeg':
      return machFromPrandtlMeyer(v, gamma)
  }
}

export function solveIsentropic(
  input: SolverInput<IsentropicInputKind>,
  gamma: number,
): Result<IsentropicState> {
  const mach = machFor(input, gamma)
  return mach.ok ? isentropicFromMach(mach.value, gamma) : mach
}

function m1For(input: SolverInput<NormalShockInputKind>, gamma: number): Result<number> {
  const v = input.value
  switch (input.kind) {
    case 'm1':
      return ok(v)
    case 'm2':
      return m1FromM2(v, gamma)
    case 'p2P1':
      return m1FromP2P1(v, gamma)
    case 'rho2Rho1':
      return m1FromRho2Rho1(v, gamma)
    case 't2T1':
      return m1FromT2T1(v, gamma)
    case 'p02P01':
      return m1FromP02P01(v, gamma)
    case 'p1P02':
      return m1FromP1P02(v, gamma)
  }
}

export function solveNormalShock(
  input: SolverInput<NormalShockInputKind>,
  gamma: number,
): Result<NormalShockState> {
  const m1 = m1For(input, gamma)
  return m1.ok ? normalShock(m1.value, gamma) : m1
}

function attachedWith(
  state: Result<ObliqueShockState>,
  max: MaxDeflection,
): Result<ObliqueSolution> {
  return state.ok ? ok({ kind: 'attached', state: state.value, max }) : state
}

export function solveOblique(
  m1: number,
  input: SolverInput<ObliqueInputKind>,
  gamma: number,
): Result<ObliqueSolution> {
  const max = maxDeflection(m1, gamma)
  if (!max.ok) return max

  switch (input.kind) {
    case 'thetaWeak':
    case 'thetaStrong': {
      const r = obliqueFromTheta(m1, input.value, gamma)
      if (!r.ok) return r
      if (r.value.kind === 'detached') return ok(r.value)
      const state = input.kind === 'thetaWeak' ? r.value.weak : r.value.strong
      return ok({ kind: 'attached', state, max: r.value.max })
    }
    case 'beta':
      return attachedWith(obliqueFromBeta(m1, input.value, gamma), max.value)
    case 'm1n':
      return attachedWith(obliqueFromM1n(m1, input.value, gamma), max.value)
  }
}
