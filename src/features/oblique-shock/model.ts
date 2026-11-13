/**
 * Oblique shock calculator model: typed inputs → a view holding both the weak and
 * strong solutions, θ-β-M chart curves, chart drags, and the wedge view geometry.
 * Pure; no React.
 */

import type { KindOption } from '@/components/KindSelect'
import {
  maxDeflection,
  normalShock,
  obliqueFromTheta,
  solveOblique,
  thetaFromBetaDeg,
  type MaxDeflection,
  type ObliqueInputKind,
  type ObliqueShockState,
  type Result,
} from '@/physics'
import { notANumber, PENDING, readNumber, seedText, type TextSolve } from '../shared/solveText'

export interface ObliqueKindInfo extends KindOption<ObliqueInputKind> {
  readonly label: string
  readonly unit?: '°'
}

export const OBLIQUE_KINDS: readonly ObliqueKindInfo[] = [
  { kind: 'thetaWeak', name: 'Turn angle θ, weak shock', label: 'θ', unit: '°' },
  { kind: 'thetaStrong', name: 'Turn angle θ, strong shock', label: 'θ', unit: '°' },
  { kind: 'beta', name: 'Wave angle β', label: 'β', unit: '°' },
  { kind: 'm1n', name: 'Normal Mach number M₁ₙ', label: 'M_{1n}' },
]

export const OBLIQUE_DEFAULTS = { gamma: '1.4', m1: '2', kind: 'thetaWeak', value: '10' } as const satisfies {
  gamma: string
  m1: string
  kind: ObliqueInputKind
  value: string
}

export function isObliqueKind(s: string | undefined): s is ObliqueInputKind {
  return OBLIQUE_KINDS.some((k) => k.kind === s)
}

export function obliqueKindInfo(kind: ObliqueInputKind): ObliqueKindInfo {
  return OBLIQUE_KINDS.find((k) => k.kind === kind) ?? OBLIQUE_KINDS[0]!
}

export type Solution = 'weak' | 'strong'

export type ObliqueView =
  | {
      readonly kind: 'attached'
      readonly m1: number
      readonly max: MaxDeflection
      readonly selected: Solution
      readonly weak: ObliqueShockState
      readonly strong: ObliqueShockState
    }
  | {
      readonly kind: 'detached'
      readonly m1: number
      readonly max: MaxDeflection
      /** The requested turn angle, which exceeds θmax. */
      readonly thetaDeg: number
      /** Density ratio behind the normal part of the bow shock (for shading). */
      readonly rhoBehindBow: number
    }

export type ObliqueField = 'gamma' | 'm1' | 'value'

function fieldFor(code: string, message: string): ObliqueField {
  if (code === 'INVALID_GAMMA' || message.startsWith('γ')) return 'gamma'
  if (message.startsWith('M1 ')) return 'm1'
  return 'value'
}

export function solveObliqueText(
  gammaText: string,
  m1Text: string,
  kind: ObliqueInputKind,
  valueText: string,
): TextSolve<ObliqueView, ObliqueField> {
  const g = readNumber(gammaText)
  if (!g.ok) return g.partial ? PENDING : notANumber('gamma', 'γ')
  const m = readNumber(m1Text)
  if (!m.ok) return m.partial ? PENDING : notANumber('m1', 'M1')
  const v = readNumber(valueText)
  if (!v.ok) return v.partial ? PENDING : notANumber('value', obliqueKindInfo(kind).label.replace(/[_{}]/g, ''))

  const gamma = g.value
  const m1 = m.value
  const sol = solveOblique(m1, { kind, value: v.value }, gamma)
  if (!sol.ok) return { result: sol, field: fieldFor(sol.error.code, sol.error.message) }

  const max = sol.value.max
  if (sol.value.kind === 'detached') {
    const ns = normalShock(m1, gamma)
    return {
      result: { ok: true, value: { kind: 'detached', m1, max, thetaDeg: v.value, rhoBehindBow: ns.ok ? ns.value.rho2Rho1 : 1 } },
      field: null,
    }
  }

  const state = sol.value.state
  const selected: Solution =
    kind === 'thetaWeak' ? 'weak' : kind === 'thetaStrong' ? 'strong' : state.betaDeg <= max.betaDeg ? 'weak' : 'strong'
  const pair = obliqueFromTheta(m1, state.thetaDeg, gamma)
  const both = pair.ok && pair.value.kind === 'attached' ? pair.value : { weak: state, strong: state }
  const value: ObliqueView = {
    kind: 'attached',
    m1,
    max,
    selected,
    // Keep the exact state the user specified; the other comes from the same θ.
    weak: selected === 'weak' ? state : both.weak,
    strong: selected === 'strong' ? state : both.strong,
  }
  return { result: { ok: true, value }, field: null }
}

export function selectedState(v: Extract<ObliqueView, { kind: 'attached' }>): ObliqueShockState {
  return v.selected === 'weak' ? v.weak : v.strong
}

/** The current view in terms of a new input kind; null if that kind cannot express it. */
export function seedValue(kind: ObliqueInputKind, v: ObliqueView): string | null {
  if (v.kind === 'detached') return kind === 'thetaWeak' || kind === 'thetaStrong' ? seedText(v.thetaDeg) : null
  const s = selectedState(v)
  switch (kind) {
    case 'thetaWeak':
    case 'thetaStrong':
      return seedText(s.thetaDeg)
    case 'beta':
      return seedText(s.betaDeg)
    case 'm1n':
      return seedText(s.m1n)
  }
}

function machAngleDeg(m1: number): number {
  return (Math.asin(1 / m1) * 180) / Math.PI
}

/**
 * Input for a wave angle picked on the θ-β-M chart, in the user's own kind. β is
 * clamped to [μ, 90°]; a turn-angle input follows the point across β at θmax,
 * switching between the weak and strong solutions.
 */
export function dragToInput(
  kind: ObliqueInputKind,
  m1: number,
  betaDeg: number,
  gamma: number,
): { kind: ObliqueInputKind; value: string } {
  const beta = Math.min(90, Math.max(machAngleDeg(m1), betaDeg))
  switch (kind) {
    case 'beta':
      return { kind, value: seedText(beta, 4) }
    case 'm1n':
      return { kind, value: seedText(m1 * Math.sin((beta * Math.PI) / 180), 4) }
    case 'thetaWeak':
    case 'thetaStrong': {
      const max = maxDeflection(m1, gamma)
      const strong = max.ok && beta > max.value.betaDeg
      return { kind: strong ? 'thetaStrong' : 'thetaWeak', value: seedText(thetaFromBetaDeg(m1, beta, gamma), 4) }
    }
  }
}

export interface ThetaBetaCurve {
  readonly m1: number
  /** [β, θ] in degrees. */
  readonly points: readonly (readonly [number, number])[]
}

/** θ against β for each M1, sampled from the Mach angle to 90°. */
export function thetaBetaCurves(gamma: number, machs: readonly number[]): ThetaBetaCurve[] {
  return machs.map((m1) => {
    const mu = machAngleDeg(m1)
    const points: [number, number][] = []
    for (let i = 0; i <= 120; i++) {
      const beta = i === 120 ? 90 : mu + ((90 - mu) * i) / 120
      points.push([beta, thetaFromBetaDeg(m1, beta, gamma)])
    }
    return { m1, points }
  })
}

/** The θmax locus: (β at θmax, θmax) for M1 from 1.05 to 20. */
export function thetaMaxLocus(gamma: number): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < 40; i++) {
    const m1 = Math.exp(Math.log(1.05) + ((Math.log(20) - Math.log(1.05)) * i) / 39)
    const r: Result<MaxDeflection> = maxDeflection(m1, gamma)
    if (r.ok) out.push([r.value.betaDeg, r.value.thetaMaxDeg])
  }
  return out
}

// --- Wedge (ramp) view ----------------------------------------------------

const APEX: readonly [number, number] = [70, 128]
const STREAM_HEIGHTS = [22, 46, 70]

export interface WedgeGeometry {
  readonly apex: readonly [number, number]
  /** Closed path of the solid: floor, then the ramp at θ. */
  readonly wall: string
  readonly shock: { x1: number; y1: number; x2: number; y2: number } | null
  readonly bow: string | null
  /** Bow-shock stand-off distance ahead of the corner (0 when attached). */
  readonly standoff: number
  /** Region behind the shock (between shock and ramp), as a closed path. */
  readonly downstream: string
  readonly streamlines: readonly (readonly [number, number])[][]
}

function rad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * A compression ramp turning the flow through θ. With β the shock is attached at
 * the corner; with β null it is detached, drawn as a bow shock standing ahead of
 * the corner, further off the more θ exceeds θmax.
 */
export function wedgeGeometry(thetaDeg: number, betaDeg: number | null, thetaMaxDeg: number): WedgeGeometry {
  const [ax, ay] = APEX
  const t = rad(thetaDeg)
  const rampEnd: [number, number] = [ax + 220 * Math.cos(t), ay - 220 * Math.sin(t)]
  const wall = `M-10,${ay} L${ax},${ay} L${rampEnd[0]},${rampEnd[1]} L230,230 L-10,230 Z`

  if (betaDeg !== null) {
    const b = rad(betaDeg)
    const end: [number, number] = [ax + 220 * Math.cos(b), ay - 220 * Math.sin(b)]
    const streamlines = STREAM_HEIGHTS.map((h) => {
      const y0 = ay - h
      const xHit = ax + h / Math.tan(b)
      return [
        [-10, y0],
        [xHit, y0],
        [230, y0 - (230 - xHit) * Math.tan(t)],
      ] satisfies [number, number][]
    })
    return {
      apex: APEX,
      wall,
      shock: { x1: ax, y1: ay, x2: end[0], y2: end[1] },
      bow: null,
      standoff: 0,
      downstream: `M${ax},${ay} L${end[0]},${end[1]} L${rampEnd[0]},${rampEnd[1]} Z`,
      streamlines,
    }
  }

  const standoff = 10 + 22 * Math.min(1, Math.max(0, (thetaDeg - thetaMaxDeg) / 20))
  const vx = ax - standoff
  const tip: [number, number] = [ax + 90, -10]
  const bow = `M${vx},${ay} Q${vx},${ay - 95} ${tip[0]},${tip[1]}`
  const streamlines = STREAM_HEIGHTS.map((h) => {
    const y0 = ay - h
    const xBend = vx + (h / 95) ** 2 * 40
    return [
      [-10, y0],
      [xBend, y0],
      [230, y0 - (230 - xBend) * Math.tan(t)],
    ] satisfies [number, number][]
  })
  return {
    apex: APEX,
    wall,
    shock: null,
    bow,
    standoff,
    downstream: `${bow} L${rampEnd[0]},${rampEnd[1]} L${ax},${ay} Z`,
    streamlines,
  }
}
