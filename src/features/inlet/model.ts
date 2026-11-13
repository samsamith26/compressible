/**
 * Multi-ramp supersonic inlet: a chain of weak oblique shocks, one per ramp, each fed by the
 * region before it. Pure functions over the physics API; no React.
 */

import {
  err,
  ok,
  solveOblique,
  type MaxDeflection,
  type ObliqueShockState,
  type ObliqueSolution,
  type Result,
} from '@/physics'

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
