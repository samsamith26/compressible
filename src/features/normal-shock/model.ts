/** Normal shock calculator model: typed inputs → physics, plus chart rows. Pure; no React. */

import type { KindOption } from '@/components/KindSelect'
import { solveNormalShock, type NormalShockInputKind, type NormalShockState } from '@/physics'
import { notANumber, PENDING, readNumber, seedText, type TextSolve } from '../shared/solveText'

export interface NormalKindInfo extends KindOption<NormalShockInputKind> {
  readonly label: string
}

export const NORMAL_KINDS: readonly NormalKindInfo[] = [
  { kind: 'm1', name: 'Upstream Mach number M₁', label: 'M_1' },
  { kind: 'm2', name: 'Downstream Mach number M₂', label: 'M_2' },
  { kind: 'p2P1', name: 'Pressure ratio p₂/p₁', label: 'p_2/p_1' },
  { kind: 'rho2Rho1', name: 'Density ratio ρ₂/ρ₁', label: 'ρ_2/ρ_1' },
  { kind: 't2T1', name: 'Temperature ratio T₂/T₁', label: 'T_2/T_1' },
  { kind: 'p02P01', name: 'Stagnation pressure ratio p₀₂/p₀₁', label: 'p_{02}/p_{01}' },
  { kind: 'p1P02', name: 'Pitot ratio p₁/p₀₂', label: 'p_1/p_{02}' },
]

export const NORMAL_DEFAULTS = { gamma: '1.4', kind: 'm1', value: '2' } as const satisfies {
  gamma: string
  kind: NormalShockInputKind
  value: string
}

export function isNormalKind(s: string | undefined): s is NormalShockInputKind {
  return NORMAL_KINDS.some((k) => k.kind === s)
}

export function normalKindInfo(kind: NormalShockInputKind): NormalKindInfo {
  return NORMAL_KINDS.find((k) => k.kind === kind) ?? NORMAL_KINDS[0]!
}

export type NormalField = 'gamma' | 'value'

export function solveNormalText(
  gammaText: string,
  kind: NormalShockInputKind,
  valueText: string,
): TextSolve<NormalShockState, NormalField> {
  const g = readNumber(gammaText)
  if (!g.ok) return g.partial ? PENDING : notANumber('gamma', 'γ')
  const v = readNumber(valueText)
  if (!v.ok) return v.partial ? PENDING : notANumber('value', normalKindInfo(kind).label.replace(/[_{}]/g, ''))
  const result = solveNormalShock({ kind, value: v.value }, g.value)
  if (result.ok) return { result, field: null }
  return { result, field: result.error.code === 'INVALID_GAMMA' || result.error.message.startsWith('γ') ? 'gamma' : 'value' }
}

export function seedValue(kind: NormalShockInputKind, s: NormalShockState): string {
  switch (kind) {
    case 'm1':
      return seedText(s.m1)
    case 'm2':
      return seedText(s.m2)
    case 'p2P1':
      return seedText(s.p2P1)
    case 'rho2Rho1':
      return seedText(s.rho2Rho1)
    case 't2T1':
      return seedText(s.t2T1)
    case 'p02P01':
      return seedText(s.p02P01)
    case 'p1P02':
      return seedText(s.p1P02)
  }
}
