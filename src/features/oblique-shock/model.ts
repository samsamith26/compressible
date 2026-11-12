import {
  maxDeflection,
  solveOblique,
  thetaFromBetaDeg,
  type ObliqueInputKind,
  type ObliqueShockState,
  type ObliqueSolution,
} from '@/physics'
import { attribute, parseField, type FieldResult, type Quantity } from '@/lib/fields'

export const OBLIQUE_KINDS: readonly ObliqueInputKind[] = ['thetaWeak', 'thetaStrong', 'beta', 'm1n']

export const OBLIQUE_INPUTS: Readonly<Record<ObliqueInputKind, Quantity>> = {
  thetaWeak: { label: 'θ, weak shock', name: 'turning angle', unit: '°' },
  thetaStrong: { label: 'θ, strong shock', name: 'turning angle', unit: '°' },
  beta: { label: 'β', name: 'wave angle', unit: '°' },
  m1n: { label: 'M₁ₙ', name: 'normal Mach number' },
}

export const M1_QUANTITY: Quantity = { label: 'M₁', name: 'upstream Mach number' }

export type ObliqueOutputKey = Exclude<keyof ObliqueShockState, 'm1'>

export const OBLIQUE_OUTPUTS: readonly (readonly [ObliqueOutputKey, Quantity])[] = [
  ['m2', { label: 'M₂', name: 'downstream Mach number' }],
  ['thetaDeg', { label: 'θ', name: 'turning angle', unit: '°' }],
  ['betaDeg', { label: 'β', name: 'wave angle', unit: '°' }],
  ['p2P1', { label: 'p₂/p₁', name: 'static pressure ratio' }],
  ['rho2Rho1', { label: 'ρ₂/ρ₁', name: 'density ratio' }],
  ['t2T1', { label: 'T₂/T₁', name: 'temperature ratio' }],
  ['p02P01', { label: 'p₀₂/p₀₁', name: 'stagnation pressure ratio' }],
  ['m1n', { label: 'M₁ₙ', name: 'upstream normal Mach number' }],
  ['m2n', { label: 'M₂ₙ', name: 'downstream normal Mach number' }],
]

export interface ObliqueText {
  readonly m1: string
  readonly kind: ObliqueInputKind
  readonly value: string
  readonly gamma: string
}

export type ObliqueField = 'gamma' | 'm1' | 'value'

export function solveObliqueText(input: ObliqueText): FieldResult<ObliqueSolution, ObliqueField> {
  const gamma = parseField(input.gamma, 'γ')
  if (!gamma.ok) return attribute(gamma, 'gamma')
  const m1 = parseField(input.m1, M1_QUANTITY.name)
  if (!m1.ok) return attribute(m1, 'm1')
  // Check the upstream state first, so an M1 problem is reported on the M1 field.
  const upstream = maxDeflection(m1.value, gamma.value)
  if (!upstream.ok) return attribute(upstream, 'm1')
  const value = parseField(input.value, OBLIQUE_INPUTS[input.kind].name)
  if (!value.ok) return attribute(value, 'value')
  return attribute(solveOblique(m1.value, { kind: input.kind, value: value.value }, gamma.value), 'value')
}

export function obliqueValue(state: ObliqueShockState, kind: ObliqueInputKind): number {
  switch (kind) {
    case 'thetaWeak':
    case 'thetaStrong':
      return state.thetaDeg
    case 'beta':
      return state.betaDeg
    case 'm1n':
      return state.m1n
  }
}

/**
 * The input that puts the shock at wave angle `betaDeg`, staying in the person's chosen kind.
 * For θ inputs the weak/strong branch follows which side of β at θmax the point is on.
 * Used when dragging the operating point on the θ-β-M chart.
 */
export function inputFromBeta(
  kind: ObliqueInputKind,
  m1: number,
  betaDeg: number,
  betaAtThetaMaxDeg: number,
  gamma: number,
): { readonly kind: ObliqueInputKind; readonly value: number } {
  switch (kind) {
    case 'beta':
      return { kind, value: betaDeg }
    case 'm1n':
      return { kind, value: m1 * Math.sin((betaDeg * Math.PI) / 180) }
    case 'thetaWeak':
    case 'thetaStrong':
      return {
        kind: betaDeg <= betaAtThetaMaxDeg ? 'thetaWeak' : 'thetaStrong',
        value: thetaFromBetaDeg(m1, betaDeg, gamma),
      }
  }
}
