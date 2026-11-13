/**
 * Multi-ramp supersonic inlet: a chain of weak oblique shocks, one per ramp, each fed by the
 * region before it. Pure functions over the physics API; no React.
 */

import {
  err,
  maxDeflection,
  ok,
  solveOblique,
  type MaxDeflection,
  type ObliqueShockState,
  type ObliqueSolution,
  type Result,
} from '@/physics'
import { attribute, parseField, type FieldResult } from '@/lib/fields'
import { toQueryNumber } from '@/lib/format'
import { parseNumber } from '@/lib/parseNumber'

export interface Ramp {
  /** This ramp's additional turning angle. */
  readonly thetaDeg: number
  /** Ramp length along the wall (dimensionless; ramp 1 = 1 by default). */
  readonly length: number
}

export interface Region {
  /** 1-based. Region 1 is the freestream; region i+1 lies behind shock i. */
  readonly index: number
  readonly mach: number
  /** Wave angle of the shock that created this region; null for the freestream. */
  readonly betaDeg: number | null
  /** The turn applied by the ramp under this region (0 for the freestream). */
  readonly thetaLocalDeg: number
  /** Wall angle under this region: the sum of turns so far. */
  readonly thetaCumDeg: number
  readonly pP1: number
  readonly rhoRho1: number
  readonly tT1: number
  readonly p0P01: number
}

interface ShockBase {
  /** 1-based ramp index. */
  readonly index: number
  readonly upstreamMach: number
  readonly thetaDeg: number
  readonly max: MaxDeflection
}

export type ShockLink =
  | (ShockBase & { readonly kind: 'attached'; readonly state: ObliqueShockState })
  | (ShockBase & { readonly kind: 'detached' })

export interface Chain {
  readonly regions: readonly Region[]
  readonly shocks: readonly ShockLink[]
  /** 1-based index of the first detached shock, or null when every shock is attached. */
  readonly detachedAt: number | null
}

export const MAX_RAMPS = 4

export const DEFAULT_RAMPS: readonly Ramp[] = [
  { thetaDeg: 8, length: 1 },
  { thetaDeg: 8, length: 0.6 },
  { thetaDeg: 8, length: 0.4 },
]

const FREESTREAM = { betaDeg: null, thetaLocalDeg: 0, thetaCumDeg: 0, pP1: 1, rhoRho1: 1, tT1: 1, p0P01: 1 }

/**
 * Chain weak oblique shocks across the ramps. Shock i uses region i as its upstream state; region
 * i+1 takes M₂ from it, and the static and stagnation ratios multiply through. A detached shock
 * ends the chain: nothing downstream of it can be computed with this model.
 */
export function solveChain(m1: number, ramps: readonly Ramp[], gamma: number): Result<Chain> {
  if (ramps.length === 0) return err('OUT_OF_RANGE', 'Add at least one ramp')
  const regions: Region[] = [{ index: 1, mach: m1, ...FREESTREAM }]
  const shocks: ShockLink[] = []

  for (const [i, ramp] of ramps.entries()) {
    const up = regions[i]
    if (up === undefined) break
    const r = solveOblique(up.mach, { kind: 'thetaWeak', value: ramp.thetaDeg }, gamma)
    if (!r.ok) return r
    const base = { index: i + 1, upstreamMach: up.mach, thetaDeg: ramp.thetaDeg, max: r.value.max }
    if (r.value.kind === 'detached') {
      shocks.push({ ...base, kind: 'detached' })
      return ok({ regions, shocks, detachedAt: i + 1 })
    }
    const s = r.value.state
    shocks.push({ ...base, kind: 'attached', state: s })
    regions.push({
      index: i + 2,
      mach: s.m2,
      betaDeg: s.betaDeg,
      thetaLocalDeg: ramp.thetaDeg,
      thetaCumDeg: up.thetaCumDeg + ramp.thetaDeg,
      pP1: up.pP1 * s.p2P1,
      rhoRho1: up.rhoRho1 * s.rho2Rho1,
      tT1: up.tT1 * s.t2T1,
      p0P01: up.p0P01 * s.p02P01,
    })
  }
  return ok({ regions, shocks, detachedAt: null })
}

export function totalTurn(ramps: readonly Ramp[]): number {
  return ramps.reduce((sum, r) => sum + r.thetaDeg, 0)
}

/** The comparison case: one weak oblique shock turning the flow through the total angle. */
export function compareSingle(m1: number, ramps: readonly Ramp[], gamma: number): Result<ObliqueSolution> {
  return solveOblique(m1, { kind: 'thetaWeak', value: totalTurn(ramps) }, gamma)
}

// --- Text inputs ------------------------------------------------------------------------------

/** Which input an error belongs to: γ, M₁, or ramp i's angle or length (1-based). */
export type InletField = 'gamma' | 'm1' | `theta${number}` | `length${number}`

export interface InletText {
  readonly gamma: string
  readonly m1: string
  readonly thetas: readonly string[]
  readonly lengths: readonly string[]
}

export interface InletSolution {
  readonly m1: number
  readonly ramps: readonly Ramp[]
  readonly chain: Chain
  /** One shock through the total turning angle, from the same M₁. */
  readonly single: ObliqueSolution
}

export type ShadeProperty = 'M' | 'p' | 'T' | 'p0'
export const SHADE_PROPERTIES: readonly ShadeProperty[] = ['M', 'p', 'T', 'p0']

export const DEFAULT_THETA_TEXTS: readonly string[] = DEFAULT_RAMPS.map((r) => String(r.thetaDeg))
export const DEFAULT_LENGTH_TEXTS: readonly string[] = DEFAULT_RAMPS.map((r) => String(r.length))

/** A comma-separated URL list with 1–4 entries, kept as typed; anything else falls back. */
export function parseList(text: string | null, fallback: readonly string[]): string[] {
  if (text === null || text === '') return [...fallback]
  const items = text.split(',')
  return items.length >= 1 && items.length <= MAX_RAMPS ? items : [...fallback]
}

function fail(field: InletField, message: string): FieldResult<never, InletField> {
  return { ok: false, field, message }
}

export function solveInletText(t: InletText): FieldResult<InletSolution, InletField> {
  const gamma = parseField(t.gamma, 'γ')
  if (!gamma.ok) return attribute(gamma, 'gamma')
  const m1 = parseField(t.m1, 'upstream Mach number')
  if (!m1.ok) return attribute(m1, 'm1')
  // Check the upstream state first, so an M₁ problem is reported on the M₁ field.
  const upstream = maxDeflection(m1.value, gamma.value)
  if (!upstream.ok) return attribute(upstream, 'm1')

  const ramps: Ramp[] = []
  for (const [i, thetaText] of t.thetas.entries()) {
    const n = i + 1
    const theta = parseField(thetaText, `ramp ${n} angle`)
    if (!theta.ok) return attribute(theta, `theta${n}`)
    if (theta.value < 0) return fail(`theta${n}`, `Ramp ${n}: turning angle must be at least 0`)
    const length = parseField(t.lengths[i] ?? '', `ramp ${n} length`)
    if (!length.ok) return attribute(length, `length${n}`)
    if (!(length.value > 0)) return fail(`length${n}`, `Ramp ${n} length must be greater than 0`)
    ramps.push({ thetaDeg: theta.value, length: length.value })
  }

  const chain = solveChain(m1.value, ramps, gamma.value)
  if (!chain.ok) return attribute(chain, 'm1')
  const single = compareSingle(m1.value, ramps, gamma.value)
  if (!single.ok) return attribute(single, 'm1')
  return { ok: true, value: { m1: m1.value, ramps, chain: chain.value, single: single.value } }
}

/** Append a ramp: 8°, at 0.7× the previous length (or 1 if that isn't a number). No-op at four. */
export function addRampTexts(
  thetas: readonly string[],
  lengths: readonly string[],
): { thetas: string[]; lengths: string[] } {
  if (thetas.length >= MAX_RAMPS) return { thetas: [...thetas], lengths: [...lengths] }
  const previous = parseNumber(lengths[lengths.length - 1] ?? '')
  const length = previous !== null && previous > 0 ? toQueryNumber(previous * 0.7, 3) : '1'
  return { thetas: [...thetas, '8'], lengths: [...lengths, length] }
}

/** Remove ramp `index0` (0-based) from both lists. The last remaining ramp can't be removed. */
export function removeRampTexts(
  thetas: readonly string[],
  lengths: readonly string[],
  index0: number,
): { thetas: string[]; lengths: string[] } {
  if (thetas.length <= 1) return { thetas: [...thetas], lengths: [...lengths] }
  return {
    thetas: thetas.filter((_, i) => i !== index0),
    lengths: lengths.filter((_, i) => i !== index0),
  }
}

/** The selected shock (1-based), kept within the shocks that exist. */
export function clampSelection(selected: number, shockCount: number): number {
  if (!Number.isFinite(selected) || selected < 1) return 1
  return Math.max(1, Math.min(Math.floor(selected), shockCount))
}
