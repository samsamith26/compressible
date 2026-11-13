/**
 * Normal shock (Rankine–Hugoniot) relations for a calorically perfect gas
 * (Anderson, Modern Compressible Flow, ch. 3). State 1 is upstream, 2 downstream.
 *
 * M1 is limited to [1, MACH_MAX] (gas.ts); each inverse accepts exactly the
 * ratios that range produces, so a validated input always has a solution.
 */

import { MACH_MAX, outOfRange, requireInRange, validateGamma } from './gas'
import { pressureRatio } from './isentropic'
import { findRoot } from './numeric'
import { ok, type Result } from './result'

export interface NormalShockState {
  readonly m1: number
  readonly m2: number
  readonly p2P1: number
  readonly rho2Rho1: number
  readonly t2T1: number
  /** Stagnation pressure ratio across the shock. */
  readonly p02P01: number
  /** Upstream static over downstream stagnation pressure (Rayleigh pitot ratio). */
  readonly p1P02: number
}

function m2Squared(m1: number, gamma: number): number {
  const h = 0.5 * (gamma - 1)
  return (1 + h * m1 * m1) / (gamma * m1 * m1 - h)
}

function p2P1Of(m1: number, gamma: number): number {
  return 1 + ((2 * gamma) / (gamma + 1)) * (m1 * m1 - 1)
}

function rho2Rho1Of(m1: number, gamma: number): number {
  return ((gamma + 1) * m1 * m1) / (2 + (gamma - 1) * m1 * m1)
}

function lnP02P01(m1: number, gamma: number): number {
  const m2 = Math.sqrt(m2Squared(m1, gamma))
  return (
    Math.log(p2P1Of(m1, gamma)) +
    Math.log(pressureRatio(m1, gamma)) -
    Math.log(pressureRatio(m2, gamma))
  )
}

function lnP1P02(m1: number, gamma: number): number {
  const m2 = Math.sqrt(m2Squared(m1, gamma))
  return Math.log(pressureRatio(m2, gamma)) - Math.log(p2P1Of(m1, gamma))
}

export function normalShock(m1: number, gamma: number): Result<NormalShockState> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const r = requireInRange('M1', m1, { lo: 1, hi: MACH_MAX, loInclusive: true, hiInclusive: true })
  if (!r.ok) return r
  return ok(normalShockRaw(m1, gamma))
}

/** Unvalidated normal shock for callers that guarantee M1 ∈ [1, MACH_MAX] and γ > 1. */
export function normalShockRaw(m1: number, gamma: number): NormalShockState {
  const p2P1 = p2P1Of(m1, gamma)
  const rho2Rho1 = rho2Rho1Of(m1, gamma)
  return {
    m1,
    m2: Math.sqrt(m2Squared(m1, gamma)),
    p2P1,
    rho2Rho1,
    t2T1: p2P1 / rho2Rho1,
    p02P01: Math.exp(lnP02P01(m1, gamma)),
    p1P02: Math.exp(lnP1P02(m1, gamma)),
  }
}

/** Range [at M1 = 1, at M1 = MACH_MAX] for a ratio that increases with M1. */
function increasingRange(atMax: number) {
  return { lo: 1, hi: atMax, loInclusive: true, hiInclusive: true }
}

/**
 * Closed-form inverses lose precision at the MACH_MAX end (e.g. ρ2/ρ1 near its
 * asymptote), so clamp the result back into the domain.
 */
function clampedM1(m1Squared: number): Result<number> {
  return ok(Math.min(Math.sqrt(m1Squared), MACH_MAX))
}

/** The M1 ↔ M2 relation is symmetric. */
export function m1FromM2(m2: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const m2Min = Math.sqrt(m2Squared(MACH_MAX, gamma))
  const r = requireInRange('M2', m2, { lo: m2Min, hi: 1, loInclusive: true, hiInclusive: true })
  if (!r.ok) return r
  return clampedM1(m2Squared(m2, gamma))
}

export function m1FromP2P1(p2P1: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const r = requireInRange('p2/p1', p2P1, increasingRange(p2P1Of(MACH_MAX, gamma)))
  if (!r.ok) return r
  return clampedM1(1 + ((p2P1 - 1) * (gamma + 1)) / (2 * gamma))
}

/** ρ2/ρ1 approaches (γ+1)/(γ−1) as M1 → ∞; its value at MACH_MAX is the bound. */
export function m1FromRho2Rho1(rho2Rho1: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const r = requireInRange('ρ2/ρ1', rho2Rho1, increasingRange(rho2Rho1Of(MACH_MAX, gamma)))
  if (!r.ok) return r
  return clampedM1((2 * rho2Rho1) / (gamma + 1 - (gamma - 1) * rho2Rho1))
}

/**
 * With x = M1², T2/T1 = τ gives 2γ(γ−1)x² + (4γ − (γ−1)² − τ(γ+1)²)x − 2(γ−1) = 0.
 * The constant term is negative, so exactly one root is positive; b < 0 for
 * τ ≥ 1, so the "+" form below has no cancellation.
 */
export function m1FromT2T1(t2T1: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const atMax = p2P1Of(MACH_MAX, gamma) / rho2Rho1Of(MACH_MAX, gamma)
  const r = requireInRange('T2/T1', t2T1, increasingRange(atMax))
  if (!r.ok) return r
  const a = 2 * gamma * (gamma - 1)
  const b = 4 * gamma - (gamma - 1) ** 2 - t2T1 * (gamma + 1) ** 2
  const c = -2 * (gamma - 1)
  return clampedM1((-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a))
}

/**
 * Inverse for a stagnation ratio that decreases with M1, solved in log space.
 * The lower bound (its value at MACH_MAX) underflows to 0 as γ → 1, so the range
 * is checked on logarithms; the target is clamped so the [1, MACH_MAX] bracket
 * holds even for inputs within round-off of either end.
 */
function m1FromDecreasingLnRatio(
  name: string,
  value: number,
  lnRatio: (m1: number) => number,
): Result<number> {
  const lnAtOne = lnRatio(1)
  const lnAtMax = lnRatio(MACH_MAX)
  const range = { lo: Math.exp(lnAtMax), hi: Math.exp(lnAtOne), loInclusive: true, hiInclusive: true }
  const r = requireInRange(name, value, { ...range, lo: 0, loInclusive: false })
  if (!r.ok) return r
  if (Math.log(value) < lnAtMax * (1 + 1e-12)) return outOfRange(name, range)
  const target = Math.min(Math.max(Math.log(value), lnAtMax), lnAtOne)
  return findRoot((m1) => lnRatio(m1) - target, 1, MACH_MAX)
}

export function m1FromP02P01(p02P01: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  return m1FromDecreasingLnRatio('p02/p01', p02P01, (m1) => lnP02P01(m1, gamma))
}

export function m1FromP1P02(p1P02: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  return m1FromDecreasingLnRatio('p1/p02', p1P02, (m1) => lnP1P02(m1, gamma))
}
