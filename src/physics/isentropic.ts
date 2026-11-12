/**
 * Isentropic flow of a calorically perfect gas (Anderson, Modern Compressible
 * Flow, ch. 3–5). Ratios are static-to-stagnation (…0) and static-to-sonic (…*).
 */

import { requireInRange, validateGamma } from './gas'
import { degToRad, expandUpper, findRoot, radToDeg } from './numeric'
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

/** Mach numbers searched by the supersonic inverses. */
const MACH_SEARCH_LIMIT = 1e8
const MACH_FLOOR = 1e-12

const POSITIVE = { lo: 0, hi: Infinity, loInclusive: false, hiInclusive: false }
const OPEN_UNIT = { lo: 0, hi: 1, loInclusive: false, hiInclusive: false }

/** T0/T = 1 + (γ−1)/2 · M² */
function stagnationTempRatio(mach: number, gamma: number): number {
  return 1 + 0.5 * (gamma - 1) * mach * mach
}

function lnAreaRatio(mach: number, gamma: number): number {
  const exponent = (gamma + 1) / (2 * (gamma - 1))
  return (
    -Math.log(mach) + exponent * Math.log((2 / (gamma + 1)) * stagnationTempRatio(mach, gamma))
  )
}

/** p/p0 at Mach M. Raw: inputs are not validated. */
export function pressureRatio(mach: number, gamma: number): number {
  return stagnationTempRatio(mach, gamma) ** (-gamma / (gamma - 1))
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
  const m = requireInRange('M', mach, POSITIVE)
  if (!m.ok) return m

  const k = stagnationTempRatio(mach, gamma)
  const tT0 = 1 / k
  const pP0 = pressureRatio(mach, gamma)
  const rhoRho0 = k ** (-1 / (gamma - 1))
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

export function machFromTT0(tT0: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const r = requireInRange('T/T0', tT0, OPEN_UNIT)
  if (!r.ok) return r
  return ok(Math.sqrt((2 / (gamma - 1)) * (1 / tT0 - 1)))
}

export function machFromPP0(pP0: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const r = requireInRange('p/p0', pP0, OPEN_UNIT)
  if (!r.ok) return r
  return machFromTT0(pP0 ** ((gamma - 1) / gamma), gamma)
}

export function machFromRhoRho0(rhoRho0: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const r = requireInRange('ρ/ρ0', rhoRho0, OPEN_UNIT)
  if (!r.ok) return r
  return machFromTT0(rhoRho0 ** (gamma - 1), gamma)
}

export function machFromAreaRatio(
  aAStar: number,
  gamma: number,
  branch: FlowBranch,
): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const r = requireInRange('A/A*', aAStar, { lo: 1, hi: Infinity, loInclusive: true, hiInclusive: false })
  if (!r.ok) return r
  if (aAStar === 1) return ok(1)

  // Solve in log space so very large ratios (γ → 1) cannot overflow.
  const target = Math.log(aAStar)
  const f = (m: number): number => lnAreaRatio(m, gamma) - target
  if (branch === 'subsonic') return findRoot(f, MACH_FLOOR, 1)
  const hi = expandUpper(f, 1, 2, MACH_SEARCH_LIMIT)
  return hi.ok ? findRoot(f, 1, hi.value) : hi
}

/** M = 1/sin μ. Independent of γ. */
export function machFromMachAngle(muDeg: number): Result<number> {
  const r = requireInRange('Mach angle', muDeg, { lo: 0, hi: 90, loInclusive: false, hiInclusive: true })
  if (!r.ok) return r
  return ok(1 / Math.sin(degToRad(muDeg)))
}

export function machFromPrandtlMeyer(nuDeg: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const nuMax = maxPrandtlMeyerDeg(gamma)
  const r = requireInRange('Prandtl–Meyer angle', nuDeg, {
    lo: 0,
    hi: nuMax,
    loInclusive: true,
    hiInclusive: false,
  })
  if (!r.ok) return r

  const f = (m: number): number => prandtlMeyerDeg(m, gamma) - nuDeg
  const hi = expandUpper(f, 1, 2, MACH_SEARCH_LIMIT)
  return hi.ok ? findRoot(f, 1, hi.value) : hi
}
