/**
 * Isentropic flow of a calorically perfect gas (Anderson, Modern Compressible
 * Flow, ch. 3–5). Ratios are static-to-stagnation (…0) and static-to-sonic (…*).
 *
 * Every solver works on the Mach domain [MACH_MIN, MACH_MAX] (gas.ts); each
 * inverse accepts exactly the ratios that domain produces, so an input that
 * passes validation always has a solution.
 */

import { MACH_MAX, MACH_MIN, outOfRange, requireInRange, validateGamma } from './gas'
import { degToRad, findRoot, radToDeg } from './numeric'
import { ok, type Result } from './result'

export interface IsentropicState {
  readonly mach: number
  /** Mach angle μ = asin(1/M); null when M < 1. */
  readonly machAngleDeg: number | null
  /** Prandtl–Meyer angle ν(M); null when M < 1. */
  readonly prandtlMeyerDeg: number | null
  readonly pP0: number
  readonly rhoRho0: number
  readonly tT0: number
  readonly pPStar: number
  readonly rhoRhoStar: number
  readonly tTStar: number
  readonly aAStar: number
}

export type FlowBranch = 'subsonic' | 'supersonic'

const MACH_RANGE = { lo: 0, hi: MACH_MAX, loInclusive: false, hiInclusive: true }

/** T0/T = 1 + (γ−1)/2 · M² */
function stagnationTempRatio(mach: number, gamma: number): number {
  return 1 + 0.5 * (gamma - 1) * mach * mach
}

/** p/p0 at Mach M. Raw: inputs are not validated. */
export function pressureRatio(mach: number, gamma: number): number {
  return stagnationTempRatio(mach, gamma) ** (-gamma / (gamma - 1))
}

function densityRatio(mach: number, gamma: number): number {
  return stagnationTempRatio(mach, gamma) ** (-1 / (gamma - 1))
}

function lnAreaRatio(mach: number, gamma: number): number {
  const exponent = (gamma + 1) / (2 * (gamma - 1))
  return (
    -Math.log(mach) + exponent * Math.log((2 / (gamma + 1)) * stagnationTempRatio(mach, gamma))
  )
}

/** A/A*(M). Raw: inputs are not validated. */
export function areaRatio(mach: number, gamma: number): number {
  return Math.exp(lnAreaRatio(mach, gamma))
}

/** ν(M) in degrees for M ≥ 1. Raw: inputs are not validated. */
export function prandtlMeyerDeg(mach: number, gamma: number): number {
  const g = (gamma + 1) / (gamma - 1)
  const m2m1 = mach * mach - 1
  return radToDeg(Math.sqrt(g) * Math.atan(Math.sqrt(m2m1 / g)) - Math.atan(Math.sqrt(m2m1)))
}

/** ν as M → ∞: 90°·(√((γ+1)/(γ−1)) − 1). */
export function maxPrandtlMeyerDeg(gamma: number): number {
  return 90 * (Math.sqrt((gamma + 1) / (gamma - 1)) - 1)
}

export function isentropicFromMach(mach: number, gamma: number): Result<IsentropicState> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const m = requireInRange('M', mach, MACH_RANGE)
  if (!m.ok) return m

  const tT0 = 1 / stagnationTempRatio(mach, gamma)
  const pP0 = pressureRatio(mach, gamma)
  const rhoRho0 = densityRatio(mach, gamma)
  const tStar = 2 / (gamma + 1)
  const supersonic = mach >= 1

  return ok({
    mach,
    machAngleDeg: supersonic ? radToDeg(Math.asin(1 / mach)) : null,
    prandtlMeyerDeg: supersonic ? prandtlMeyerDeg(mach, gamma) : null,
    pP0,
    rhoRho0,
    tT0,
    tTStar: tT0 / tStar,
    pPStar: pP0 / tStar ** (gamma / (gamma - 1)),
    rhoRhoStar: rhoRho0 / tStar ** (1 / (gamma - 1)),
    aAStar: areaRatio(mach, gamma),
  })
}

/**
 * Shared inverse for T/T0, p/p0 and ρ/ρ0, which all reduce to T/T0. The valid
 * range is (ratio at MACH_MAX, 1); that lower end underflows to 0 as γ → 1.
 */
function machFromStagnationRatio(
  name: string,
  value: number,
  gamma: number,
  ratioAt: (mach: number) => number,
  toTT0: (ratio: number) => number,
): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const lo = ratioAt(MACH_MAX)
  const range = { lo, hi: 1, loInclusive: lo > 0, hiInclusive: false }
  const r = requireInRange(name, value, range)
  if (!r.ok) return r
  const mach = Math.sqrt((2 / (gamma - 1)) * (1 / toTT0(value) - 1))
  // Round-off: a ratio an ulp below 1 can map to M = 0 (reject it under the user's
  // name), and one at the lower end to just past MACH_MAX (clamp it).
  return mach > 0 ? ok(Math.min(mach, MACH_MAX)) : outOfRange(name, range)
}

export function machFromTT0(tT0: number, gamma: number): Result<number> {
  return machFromStagnationRatio(
    'T/T0',
    tT0,
    gamma,
    (m) => 1 / stagnationTempRatio(m, gamma),
    (r) => r,
  )
}

export function machFromPP0(pP0: number, gamma: number): Result<number> {
  return machFromStagnationRatio(
    'p/p0',
    pP0,
    gamma,
    (m) => pressureRatio(m, gamma),
    (r) => r ** ((gamma - 1) / gamma),
  )
}

export function machFromRhoRho0(rhoRho0: number, gamma: number): Result<number> {
  return machFromStagnationRatio(
    'ρ/ρ0',
    rhoRho0,
    gamma,
    (m) => densityRatio(m, gamma),
    (r) => r ** (gamma - 1),
  )
}

/**
 * Solved in log space so very large ratios (γ → 1) cannot overflow. The upper
 * bound is A/A* at MACH_MIN (subsonic) or MACH_MAX (supersonic); for γ near 1
 * the latter overflows to Infinity, making every finite ratio reachable.
 */
export function machFromAreaRatio(
  aAStar: number,
  gamma: number,
  branch: FlowBranch,
): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const edge = branch === 'subsonic' ? MACH_MIN : MACH_MAX
  const lnMax = lnAreaRatio(edge, gamma)
  const range = { lo: 1, hi: Math.exp(lnMax), loInclusive: true, hiInclusive: true }
  const r = requireInRange('A/A*', aAStar, { ...range, hi: Infinity })
  if (!r.ok) return r
  if (Math.log(aAStar) > lnMax * (1 + 1e-12)) return outOfRange('A/A*', range)
  if (aAStar === 1) return ok(1)

  // Clamp so a ratio within round-off of the bound still brackets at the edge.
  const target = Math.min(Math.log(aAStar), lnMax)
  const f = (m: number): number => lnAreaRatio(m, gamma) - target
  return branch === 'subsonic' ? findRoot(f, MACH_MIN, 1) : findRoot(f, 1, MACH_MAX)
}

/** M = 1/sin μ. Independent of γ. */
export function machFromMachAngle(muDeg: number): Result<number> {
  const r = requireInRange('Mach angle', muDeg, {
    lo: radToDeg(Math.asin(1 / MACH_MAX)),
    hi: 90,
    loInclusive: true,
    hiInclusive: true,
  })
  if (!r.ok) return r
  return ok(Math.min(1 / Math.sin(degToRad(muDeg)), MACH_MAX))
}

export function machFromPrandtlMeyer(nuDeg: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const r = requireInRange('Prandtl–Meyer angle', nuDeg, {
    lo: 0,
    hi: prandtlMeyerDeg(MACH_MAX, gamma),
    loInclusive: true,
    hiInclusive: true,
  })
  if (!r.ok) return r
  return findRoot((m) => prandtlMeyerDeg(m, gamma) - nuDeg, 1, MACH_MAX)
}
