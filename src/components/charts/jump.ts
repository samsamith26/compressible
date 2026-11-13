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
