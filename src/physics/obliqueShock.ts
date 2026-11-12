/**
 * Oblique shock relations for a calorically perfect gas (Anderson, Modern
 * Compressible Flow, ch. 4). θ is the flow turning (wedge) angle, β the wave angle.
 */

import { MACH_MAX, requireInRange, validateGamma } from './gas'
import { normalShockRaw } from './normalShock'
import { degToRad, findRoot, radToDeg } from './numeric'
import { ok, type Result } from './result'

export interface ObliqueShockState {
  readonly m1: number
  /** Upstream Mach component normal to the shock, M1·sin β. */
  readonly m1n: number
  readonly m2n: number
  readonly m2: number
  readonly thetaDeg: number
  readonly betaDeg: number
  readonly p2P1: number
  readonly rho2Rho1: number
  readonly t2T1: number
  readonly p02P01: number
}

export interface MaxDeflection {
  readonly thetaMaxDeg: number
  /** Wave angle at which θ = θmax; separates weak (below) from strong (above). */
  readonly betaDeg: number
}

export type ObliqueFromTheta =
  | {
      readonly kind: 'attached'
      readonly weak: ObliqueShockState
      readonly strong: ObliqueShockState
      readonly max: MaxDeflection
    }
  | { readonly kind: 'detached'; readonly max: MaxDeflection }

const SUPERSONIC = { lo: 1, hi: MACH_MAX, loInclusive: false, hiInclusive: true }
/** θ within this many degrees of θmax is treated as exactly θmax. */
const THETA_MAX_TOL = 1e-12

function machAngleDeg(m1: number): number {
  return radToDeg(Math.asin(1 / m1))
}

/**
 * θ-β-M relation: tan θ = 2 cot β (M1² sin²β − 1) / (M1²(γ + cos 2β) + 2).
 * Raw (unvalidated); returns 0 for β ≤ μ and at β = 90°. Used for chart curves.
 */
export function thetaFromBetaDeg(m1: number, betaDeg: number, gamma: number): number {
  if (betaDeg === 90) return 0
  const b = degToRad(betaDeg)
  const num = 2 * (m1 * m1 * Math.sin(b) ** 2 - 1)
  const den = Math.tan(b) * (m1 * m1 * (gamma + Math.cos(2 * b)) + 2)
  return Math.max(0, radToDeg(Math.atan(num / den)))
}

function validateUpstream(m1: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  return requireInRange('M1', m1, SUPERSONIC)
}

/** Unvalidated: callers guarantee γ > 1, M1 > 1 and β ∈ [μ, 90°]. */
function stateFromBeta(m1: number, betaDeg: number, gamma: number): ObliqueShockState {
  // At β = μ, M1·sin β can round to just under 1; it is 1 analytically.
  const m1n = Math.max(1, m1 * Math.sin(degToRad(betaDeg)))
  const n = normalShockRaw(m1n, gamma)
  const thetaDeg = thetaFromBetaDeg(m1, betaDeg, gamma)
  return {
    m1,
    m1n,
    m2n: n.m2,
    m2: n.m2 / Math.sin(degToRad(betaDeg - thetaDeg)),
    thetaDeg,
    betaDeg,
    p2P1: n.p2P1,
    rho2Rho1: n.rho2Rho1,
    t2T1: n.t2T1,
    p02P01: n.p02P01,
  }
}

function maxDeflectionRaw(m1: number, gamma: number): MaxDeflection {
  const m2 = m1 * m1
  const gp = gamma + 1
  const sin2 =
    (gp * m2 - 4 + Math.sqrt(gp * (gp * m2 * m2 + 8 * (gamma - 1) * m2 + 16))) / (4 * gamma * m2)
  const betaDeg = radToDeg(Math.asin(Math.sqrt(sin2)))
  return { thetaMaxDeg: thetaFromBetaDeg(m1, betaDeg, gamma), betaDeg }
}

export function maxDeflection(m1: number, gamma: number): Result<MaxDeflection> {
  const v = validateUpstream(m1, gamma)
  if (!v.ok) return v
  return ok(maxDeflectionRaw(m1, gamma))
}

export function obliqueFromBeta(
  m1: number,
  betaDeg: number,
  gamma: number,
): Result<ObliqueShockState> {
  const v = validateUpstream(m1, gamma)
  if (!v.ok) return v
  // Relative 1e-12 slack so β typed as exactly μ (e.g. 30° at M1 = 2) is accepted
  // even when asin round-off puts μ an ulp above it; stateFromBeta clamps M1n to 1.
  const b = requireInRange('Wave angle', betaDeg, {
    lo: machAngleDeg(m1) * (1 - 1e-12),
    hi: 90,
    loInclusive: true,
    hiInclusive: true,
  })
  if (!b.ok) return b
  return ok(stateFromBeta(m1, betaDeg, gamma))
}

export function obliqueFromM1n(m1: number, m1n: number, gamma: number): Result<ObliqueShockState> {
  const v = validateUpstream(m1, gamma)
  if (!v.ok) return v
  const r = requireInRange('M1n', m1n, { lo: 1, hi: m1, loInclusive: true, hiInclusive: true })
  if (!r.ok) return r
  // Skip β re-validation: asin round-off can put β an ulp below μ when M1n = 1.
  return ok(stateFromBeta(m1, radToDeg(Math.asin(m1n / m1)), gamma))
}

export function obliqueFromTheta(
  m1: number,
  thetaDeg: number,
  gamma: number,
): Result<ObliqueFromTheta> {
  const v = validateUpstream(m1, gamma)
  if (!v.ok) return v
  const t = requireInRange('Turning angle', thetaDeg, {
    lo: 0,
    hi: Infinity,
    loInclusive: true,
    hiInclusive: false,
  })
  if (!t.ok) return t

  const max = maxDeflectionRaw(m1, gamma)
  let weakDeg = max.betaDeg
  let strongDeg = max.betaDeg

  if (thetaDeg > max.thetaMaxDeg + THETA_MAX_TOL) return ok({ kind: 'detached', max })
  if (thetaDeg < max.thetaMaxDeg - THETA_MAX_TOL) {
    const mu = machAngleDeg(m1)
    // θ(μ) = θ(90°) = 0 analytically; pin the endpoints so round-off cannot break the bracket.
    const f = (b: number): number =>
      b === mu || b === 90 ? -thetaDeg : thetaFromBetaDeg(m1, b, gamma) - thetaDeg
    const weak = findRoot(f, mu, max.betaDeg)
    const strong = findRoot(f, max.betaDeg, 90)
    // Unreachable: f(μ) = f(90°) = −θ ≤ 0 < f(β_max), so both brackets are valid and Brent
    // converges well inside its iteration cap. Kept so a future change cannot fail silently.
    /* v8 ignore start */
    if (!weak.ok) return weak
    if (!strong.ok) return strong
    /* v8 ignore stop */
    weakDeg = weak.value
    strongDeg = strong.value
  }

  return ok({
    kind: 'attached',
    weak: stateFromBeta(m1, weakDeg, gamma),
    strong: stateFromBeta(m1, strongDeg, gamma),
    max,
  })
}
