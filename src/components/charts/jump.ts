/** Data and scale helpers for the across-the-shock (dumbbell) chart. */

export interface JumpRow {
  readonly key: string
  /** Quantity label markup, e.g. "p_2/p_1". */
  readonly label: string
  /** Downstream ÷ upstream. Upstream is the reference, 1. */
  readonly ratio: number
}

/** Log-axis domain that holds 1 and every ratio, padded so end labels fit. */
export function jumpDomain(ratios: readonly number[]): [number, number] {
  const finite = ratios.filter((r) => Number.isFinite(r) && r > 0)
  const lo = Math.min(1, ...finite)
  const hi = Math.max(1, ...finite)
  return [lo / 1.6, hi * 1.9]
}

/** Downstream ÷ upstream for the jump chart: static p, ρ, T, then stagnation p. */
export function jumpRows(s: { p2P1: number; rho2Rho1: number; t2T1: number; p02P01: number }): JumpRow[] {
  return [
    { key: 'p', label: 'p_2/p_1', ratio: s.p2P1 },
    { key: 'rho', label: 'ρ_2/ρ_1', ratio: s.rho2Rho1 },
    { key: 't', label: 'T_2/T_1', ratio: s.t2T1 },
    { key: 'p0', label: 'p_{02}/p_{01}', ratio: s.p02P01 },
  ]
}
