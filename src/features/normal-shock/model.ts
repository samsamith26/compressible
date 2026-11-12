import {
  solveNormalShock,
  type NormalShockInputKind,
  type NormalShockState,
} from '@/physics'
import { attribute, parseField, type FieldResult, type Quantity } from '@/lib/fields'

export const NORMAL_SHOCK_KINDS: readonly NormalShockInputKind[] = [
  'm1',
  'm2',
  'p2P1',
  'rho2Rho1',
  't2T1',
  'p02P01',
  'p1P02',
]

/** Input kinds share their keys with NormalShockState, so one table labels both. */
export const NORMAL_SHOCK_QUANTITIES: Readonly<Record<NormalShockInputKind, Quantity>> = {
  m1: { label: 'M₁', name: 'upstream Mach number' },
  m2: { label: 'M₂', name: 'downstream Mach number' },
  p2P1: { label: 'p₂/p₁', name: 'static pressure ratio' },
  rho2Rho1: { label: 'ρ₂/ρ₁', name: 'density ratio' },
  t2T1: { label: 'T₂/T₁', name: 'temperature ratio' },
  p02P01: { label: 'p₀₂/p₀₁', name: 'stagnation pressure ratio' },
  p1P02: { label: 'p₁/p₀₂', name: 'pitot pressure ratio' },
}

export const NORMAL_SHOCK_OUTPUTS: readonly NormalShockInputKind[] = [
  'm1',
  'm2',
  'p02P01',
  'p1P02',
  'p2P1',
  'rho2Rho1',
  't2T1',
]

export function solveNormalShockText(
  kind: NormalShockInputKind,
  valueText: string,
  gammaText: string,
): FieldResult<NormalShockState, 'value' | 'gamma'> {
  const gamma = parseField(gammaText, 'γ')
  if (!gamma.ok) return attribute(gamma, 'gamma')
  const value = parseField(valueText, NORMAL_SHOCK_QUANTITIES[kind].name)
  if (!value.ok) return attribute(value, 'value')
  return attribute(solveNormalShock({ kind, value: value.value }, gamma.value), 'value')
}

export function normalShockValue(state: NormalShockState, kind: NormalShockInputKind): number {
  return state[kind]
}
