import {
  isentropicFromMach,
  solveIsentropic,
  type IsentropicInputKind,
  type IsentropicState,
} from '@/physics'
import { attribute, parseField, type FieldResult, type Quantity } from '@/lib/fields'
import { shortestText } from '@/lib/format'

export const ISENTROPIC_KINDS: readonly IsentropicInputKind[] = [
  'mach',
  'tT0',
  'pP0',
  'rhoRho0',
  'areaSub',
  'areaSup',
  'machAngleDeg',
  'prandtlMeyerDeg',
]

export const ISENTROPIC_INPUTS: Readonly<Record<IsentropicInputKind, Quantity>> = {
  mach: { label: 'M', name: 'Mach number' },
  tT0: { label: 'T/T₀', name: 'temperature ratio' },
  pP0: { label: 'p/p₀', name: 'pressure ratio' },
  rhoRho0: { label: 'ρ/ρ₀', name: 'density ratio' },
  areaSub: { label: 'A/A* (subsonic)', name: 'area ratio' },
  areaSup: { label: 'A/A* (supersonic)', name: 'area ratio' },
  machAngleDeg: { label: 'μ', name: 'Mach angle', unit: '°' },
  prandtlMeyerDeg: { label: 'ν', name: 'Prandtl–Meyer angle', unit: '°' },
}

export type IsentropicOutputKey = keyof IsentropicState

export const ISENTROPIC_OUTPUTS: readonly (readonly [IsentropicOutputKey, Quantity])[] = [
  ['mach', { label: 'M', name: 'Mach number' }],
  ['machAngleDeg', { label: 'μ', name: 'Mach angle', unit: '°' }],
  ['prandtlMeyerDeg', { label: 'ν', name: 'Prandtl–Meyer angle', unit: '°' }],
  ['pP0', { label: 'p/p₀', name: 'static to stagnation pressure' }],
  ['rhoRho0', { label: 'ρ/ρ₀', name: 'static to stagnation density' }],
  ['tT0', { label: 'T/T₀', name: 'static to stagnation temperature' }],
  ['pPStar', { label: 'p/p*', name: 'pressure to sonic pressure' }],
  ['rhoRhoStar', { label: 'ρ/ρ*', name: 'density to sonic density' }],
  ['tTStar', { label: 'T/T*', name: 'temperature to sonic temperature' }],
  ['aAStar', { label: 'A/A*', name: 'area to sonic throat area' }],
]

export function solveIsentropicText(
  kind: IsentropicInputKind,
  valueText: string,
  gammaText: string,
): FieldResult<IsentropicState, 'value' | 'gamma'> {
  const gamma = parseField(gammaText, 'γ')
  if (!gamma.ok) return attribute(gamma, 'gamma')
  const value = parseField(valueText, ISENTROPIC_INPUTS[kind].name)
  if (!value.ok) return attribute(value, 'value')
  return attribute(solveIsentropic({ kind, value: value.value }, gamma.value), 'value')
}

/** The value `kind` takes in `state`, or null when the state cannot express it (angles below M = 1). */
export function isentropicValue(state: IsentropicState, kind: IsentropicInputKind): number | null {
  switch (kind) {
    case 'mach':
      return state.mach
    case 'tT0':
      return state.tT0
    case 'pP0':
      return state.pP0
    case 'rhoRho0':
      return state.rhoRho0
    case 'areaSub':
    case 'areaSup':
      return state.aAStar
    case 'machAngleDeg':
      return state.machAngleDeg
    case 'prandtlMeyerDeg':
      return state.prandtlMeyerDeg
  }
}

/**
 * The input that reproduces Mach number `mach`, staying in `kind` where possible. Used when the
 * person drags the chart marker: the field they chose keeps showing its own quantity.
 */
export function inputFromMach(
  kind: IsentropicInputKind,
  mach: number,
  gamma: number,
): { readonly kind: IsentropicInputKind; readonly value: number } {
  const fallback: { readonly kind: IsentropicInputKind; readonly value: number } = {
    kind: 'mach',
    value: mach,
  }
  const state = isentropicFromMach(mach, gamma)
  if (!state.ok) return fallback
  const resolved: IsentropicInputKind =
    kind === 'areaSub' || kind === 'areaSup' ? (mach < 1 ? 'areaSub' : 'areaSup') : kind
  const value = isentropicValue(state.value, resolved)
  return value === null ? fallback : { kind: resolved, value }
}

/**
 * Text for a dragged input: as short as possible while it still solves to within 0.1% of the
 * dragged Mach number (ratios near 1, like T/T₀ at low M, need more digits).
 */
export function dragInputText(
  input: { readonly kind: IsentropicInputKind; readonly value: number },
  gammaText: string,
  targetMach: number,
): string {
  return shortestText(input.value, (rounded) => {
    const r = solveIsentropicText(input.kind, String(rounded), gammaText)
    return r.ok && Math.abs(r.value.mach - targetMach) <= 1e-3 * targetMach
  })
}
