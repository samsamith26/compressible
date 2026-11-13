/**
 * Isentropic calculator model: maps typed inputs to physics calls, and computes
 * the geometry for the nozzle view and the ratio charts. Pure; no React.
 */

import type { KindOption } from '@/components/KindSelect'
import {
  isentropicFromMach,
  machFromAreaRatio,
  solveIsentropic,
  type IsentropicInputKind,
  type IsentropicState,
} from '@/physics'
import { notANumber, PENDING, readNumber, seedText, type TextSolve } from '../shared/solveText'

export interface IsentropicKindInfo extends KindOption<IsentropicInputKind> {
  /** Quantity label markup for the value field. */
  readonly label: string
  readonly unit?: '°'
}

export const ISENTROPIC_KINDS: readonly IsentropicKindInfo[] = [
  { kind: 'mach', name: 'Mach number', label: 'M' },
  { kind: 'tT0', name: 'Temperature ratio T/T₀', label: 'T/T_0' },
  { kind: 'pP0', name: 'Pressure ratio p/p₀', label: 'p/p_0' },
  { kind: 'rhoRho0', name: 'Density ratio ρ/ρ₀', label: 'ρ/ρ_0' },
  { kind: 'areaSub', name: 'Area ratio A/A*, subsonic', label: 'A/A*' },
  { kind: 'areaSup', name: 'Area ratio A/A*, supersonic', label: 'A/A*' },
  { kind: 'machAngleDeg', name: 'Mach angle μ', label: 'μ', unit: '°' },
  { kind: 'prandtlMeyerDeg', name: 'Prandtl–Meyer angle ν', label: 'ν', unit: '°' },
]

export const ISENTROPIC_DEFAULTS = { gamma: '1.4', kind: 'mach', value: '2' } as const satisfies {
  gamma: string
  kind: IsentropicInputKind
  value: string
}

export function isIsentropicKind(s: string | undefined): s is IsentropicInputKind {
  return ISENTROPIC_KINDS.some((k) => k.kind === s)
}

export function kindInfo(kind: IsentropicInputKind): IsentropicKindInfo {
  return ISENTROPIC_KINDS.find((k) => k.kind === kind) ?? ISENTROPIC_KINDS[0]!
}

export type IsentropicField = 'gamma' | 'value'

export function solveIsentropicText(
  gammaText: string,
  kind: IsentropicInputKind,
  valueText: string,
): TextSolve<IsentropicState, IsentropicField> {
  const g = readNumber(gammaText)
  if (!g.ok) return g.partial ? PENDING : notANumber('gamma', 'γ')
  const v = readNumber(valueText)
  if (!v.ok) return v.partial ? PENDING : notANumber('value', kindInfo(kind).label.replace(/_/g, ''))
  const result = solveIsentropic({ kind, value: v.value }, g.value)
  if (result.ok) return { result, field: null }
  return { result, field: result.error.code === 'INVALID_GAMMA' || result.error.message.startsWith('γ') ? 'gamma' : 'value' }
}

/** The state's value for a kind, as seed text; null if the kind cannot describe it (an angle below M = 1). */
export function seedValue(kind: IsentropicInputKind, s: IsentropicState): string | null {
  switch (kind) {
    case 'mach':
      return seedText(s.mach)
    case 'tT0':
      return seedText(s.tT0)
    case 'pP0':
      return seedText(s.pP0)
    case 'rhoRho0':
      return seedText(s.rhoRho0)
    case 'areaSub':
    case 'areaSup':
      return seedText(s.aAStar)
    case 'machAngleDeg':
      return s.machAngleDeg === null ? null : seedText(s.machAngleDeg)
    case 'prandtlMeyerDeg':
      return s.prandtlMeyerDeg === null ? null : seedText(s.prandtlMeyerDeg)
  }
}

/**
 * Input for a Mach number picked on a chart, in the user's own kind so a drag
 * never changes what they chose to specify. Area switches branch with M.
 */
export function machToInput(
  kind: IsentropicInputKind,
  mach: number,
  gamma: number,
): { kind: IsentropicInputKind; value: string } | null {
  if (kind === 'mach') return { kind, value: seedText(mach, 4) }
  const s = isentropicFromMach(mach, gamma)
  if (!s.ok) return null
  const next: IsentropicInputKind =
    kind === 'areaSub' || kind === 'areaSup' ? (mach < 1 ? 'areaSub' : 'areaSup') : kind
  const value = seedValue(next, s.value)
  return value === null ? null : { kind: next, value }
}

export interface RatioPoint {
  readonly mach: number
  readonly pP0: number
  readonly rhoRho0: number
  readonly tT0: number
  readonly aAStar: number
}

/** 200 log-spaced samples from M = 0.05 to machMax. */
export function ratioCurves(gamma: number, machMax: number): RatioPoint[] {
  const lo = Math.log(0.05)
  const hi = Math.log(machMax)
  const pts: RatioPoint[] = []
  for (let i = 0; i < 200; i++) {
    const mach = Math.exp(lo + ((hi - lo) * i) / 199)
    const s = isentropicFromMach(mach, gamma)
    if (s.ok) pts.push({ mach, pP0: s.value.pP0, rhoRho0: s.value.rhoRho0, tT0: s.value.tT0, aAStar: s.value.aAStar })
  }
  return pts
}

/** Right end of the M axis: 5, or enough to show the current M. */
export function machAxisMax(mach: number): number {
  return mach <= 4 ? 5 : Math.min(Math.ceil(mach * 1.25), 50)
}

// --- Nozzle view ---------------------------------------------------------

const INLET_X = 22
const THROAT_X = 82
const EXIT_X = 182
const AXIS_Y = 100
const THROAT_HALF = 12
const INLET_AREA = 3
/** Largest exit area ratio the window can draw (half-height 12·√12 ≈ 42). */
const MAX_EXIT_AREA = 12

export interface NozzleGeometry {
  readonly upper: readonly (readonly [number, number])[]
  readonly lower: readonly (readonly [number, number])[]
  readonly throatX: number
  readonly exitX: number
  readonly stationX: number
  readonly stationHalf: number
  /** True when A/A* is larger than the drawn exit, so the station sits at the exit. */
  readonly clamped: boolean
  /** Density along the nozzle (offset 0–1 from inlet to exit), for the gradient fill. */
  readonly stops: readonly { offset: number; rho: number }[]
}

/** Smooth area distribution: cosine blends inlet → throat → exit. */
function areaAt(x: number, exitArea: number): number {
  if (x <= THROAT_X) {
    const t = (x - INLET_X) / (THROAT_X - INLET_X)
    return 1 + (INLET_AREA - 1) * (0.5 + 0.5 * Math.cos(Math.PI * t))
  }
  const t = (x - THROAT_X) / (EXIT_X - THROAT_X)
  return 1 + (exitArea - 1) * (0.5 - 0.5 * Math.cos(Math.PI * t))
}

/** Half-height for an area ratio (axisymmetric: radius ∝ √A). */
function halfFor(area: number): number {
  return THROAT_HALF * Math.sqrt(area)
}

/** x on one side of the throat where the area equals a (monotone there, so bisect). */
function xForArea(a: number, exitArea: number, supersonic: boolean): number {
  let lo = supersonic ? THROAT_X : INLET_X
  let hi = supersonic ? EXIT_X : THROAT_X
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const am = areaAt(mid, exitArea)
    // Area falls toward the throat on the subsonic side, rises after it.
    if (supersonic ? am < a : am > a) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function nozzleGeometry(s: IsentropicState, gamma: number): NozzleGeometry {
  const supersonic = s.mach > 1
  const exitArea = supersonic ? Math.min(MAX_EXIT_AREA, Math.max(2.5, s.aAStar * 1.2)) : 2.5
  const sideMax = supersonic ? exitArea : INLET_AREA
  const clamped = s.aAStar > sideMax
  const stationX = s.mach === 1 ? THROAT_X : clamped ? (supersonic ? EXIT_X : INLET_X) : xForArea(s.aAStar, exitArea, supersonic)

  const upper: [number, number][] = []
  const lower: [number, number][] = []
  for (let x = INLET_X; x <= EXIT_X + 1e-9; x += 2) {
    const h = halfFor(areaAt(x, exitArea))
    upper.push([x, AXIS_Y - h])
    lower.push([x, AXIS_Y + h])
  }

  const stops: { offset: number; rho: number }[] = []
  for (let i = 0; i <= 12; i++) {
    const x = INLET_X + ((EXIT_X - INLET_X) * i) / 12
    const area = areaAt(x, exitArea)
    const downstream = x > THROAT_X
    const branch = downstream && supersonic ? 'supersonic' : 'subsonic'
    const m = area <= 1 ? { ok: true as const, value: 1 } : machFromAreaRatio(area, gamma, branch)
    const st = m.ok ? isentropicFromMach(m.value, gamma) : null
    stops.push({ offset: i / 12, rho: st?.ok === true ? st.value.rhoRho0 : 1 })
  }

  return {
    upper,
    lower,
    throatX: THROAT_X,
    exitX: EXIT_X,
    stationX,
    stationHalf: halfFor(areaAt(stationX, exitArea)),
    clamped,
    stops,
  }
}
