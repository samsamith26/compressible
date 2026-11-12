/**
 * Normal shock (Rankine–Hugoniot) relations for a calorically perfect gas
 * (Anderson, Modern Compressible Flow, ch. 3). State 1 is upstream, 2 downstream.
 */

import { requireInRange, validateGamma } from './gas'
import { pressureRatio } from './isentropic'
import { expandUpper, findRoot } from './numeric'
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

const M1_SEARCH_LIMIT = 1e6

function m2Squared(m1: number, gamma: number): number {
  const h = 0.5 * (gamma - 1)
  return (1 + h * m1 * m1) / (gamma * m1 * m1 - h)
}

function p2P1Of(m1: number, gamma: number): number {
  return 1 + ((2 * gamma) / (gamma + 1)) * (m1 * m1 - 1)
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
  const r = requireInRange('M1', m1, { lo: 1, hi: Infinity, loInclusive: true, hiInclusive: false })
  if (!r.ok) return r
  return ok(normalShockRaw(m1, gamma))
}

/** Unvalidated normal shock for callers that guarantee M1 ≥ 1 and γ > 1 (oblique shocks). */
export function normalShockRaw(m1: number, gamma: number): NormalShockState {
  const p2P1 = p2P1Of(m1, gamma)
  const rho2Rho1 = ((gamma + 1) * m1 * m1) / (2 + (gamma - 1) * m1 * m1)
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

/** The M1 ↔ M2 relation is symmetric. */
export function m1FromM2(m2: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const m2Min = Math.sqrt((gamma - 1) / (2 * gamma))
  const r = requireInRange('M2', m2, { lo: m2Min, hi: 1, loInclusive: false, hiInclusive: true })
  if (!r.ok) return r
  return ok(Math.sqrt(m2Squared(m2, gamma)))
}

export function m1FromP2P1(p2P1: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const r = requireInRange('p2/p1', p2P1, { lo: 1, hi: Infinity, loInclusive: true, hiInclusive: false })
  if (!r.ok) return r
  return ok(Math.sqrt(1 + ((p2P1 - 1) * (gamma + 1)) / (2 * gamma)))
}

export function m1FromRho2Rho1(rho2Rho1: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  // (γ+1)/(γ−1) is the M1 → ∞ limit. γ − 1 is inexact in floating point (1.4 − 1 =
  // 0.3999…), so shave a relative 1e-12 off to make the limit itself reliably excluded.
  const max = ((gamma + 1) / (gamma - 1)) * (1 - 1e-12)
  const r = requireInRange('ρ2/ρ1', rho2Rho1, { lo: 1, hi: max, loInclusive: true, hiInclusive: false })
  if (!r.ok) return r
  return ok(Math.sqrt((2 * rho2Rho1) / (gamma + 1 - (gamma - 1) * rho2Rho1)))
}

/**
 * With x = M1², T2/T1 = τ gives 2γ(γ−1)x² + (4γ − (γ−1)² − τ(γ+1)²)x − 2(γ−1) = 0.
 * The constant term is negative, so exactly one root is positive; b < 0 for
 * τ ≥ 1, so the "+" form below has no cancellation.
 */
export function m1FromT2T1(t2T1: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const r = requireInRange('T2/T1', t2T1, { lo: 1, hi: Infinity, loInclusive: true, hiInclusive: false })
  if (!r.ok) return r
  const a = 2 * gamma * (gamma - 1)
  const b = 4 * gamma - (gamma - 1) ** 2 - t2T1 * (gamma + 1) ** 2
  const c = -2 * (gamma - 1)
  return ok(Math.sqrt((-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)))
}

function solveM1(f: (m1: number) => number): Result<number> {
  const hi = expandUpper(f, 1, 2, M1_SEARCH_LIMIT)
  return hi.ok ? findRoot(f, 1, hi.value) : hi
}

export function m1FromP02P01(p02P01: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  const r = requireInRange('p02/p01', p02P01, { lo: 0, hi: 1, loInclusive: false, hiInclusive: true })
  if (!r.ok) return r
  const target = Math.log(p02P01)
  return solveM1((m1) => lnP02P01(m1, gamma) - target)
}

export function m1FromP1P02(p1P02: number, gamma: number): Result<number> {
  const g = validateGamma(gamma)
  if (!g.ok) return g
  // Maximum at M1 = 1, computed with the same expression the forward relation uses.
  const max = Math.exp(lnP1P02(1, gamma))
  const r = requireInRange('p1/p02', p1P02, { lo: 0, hi: max, loInclusive: false, hiInclusive: true })
  if (!r.ok) return r
  const target = Math.log(p1P02)
  return solveM1((m1) => lnP1P02(m1, gamma) - target)
}
