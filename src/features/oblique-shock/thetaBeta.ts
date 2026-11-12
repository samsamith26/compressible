import { maxDeflection, thetaFromBetaDeg } from '@/physics'

export interface ThetaBeta {
  readonly thetaDeg: number
  readonly betaDeg: number
}

/** The Mach numbers drawn as the background family on the θ-β-M chart. */
export const MACH_FAMILY: readonly number[] = [1.2, 1.5, 2, 3, 5, 10]

const machAngleDeg = (m1: number): number => (Math.asin(1 / m1) * 180) / Math.PI

/** θ(β) for one upstream Mach number, β from the Mach angle μ to 90°. */
export function machCurve(m1: number, gamma: number, samples = 200): ThetaBeta[] {
  const mu = machAngleDeg(m1)
  return Array.from({ length: samples + 1 }, (_, i) => {
    // Cluster samples near μ, where θ rises fastest.
    const t = i / samples
    const betaDeg = mu + (90 - mu) * (1 - Math.cos((t * Math.PI) / 2)) ** 0.75
    return { thetaDeg: thetaFromBetaDeg(m1, betaDeg, gamma), betaDeg }
  })
}

/** The locus of (θmax, β at θmax) over M1, which separates weak from strong solutions. */
export function thetaMaxLocus(gamma: number, samples = 60): ThetaBeta[] {
  const points: ThetaBeta[] = []
  for (let i = 0; i <= samples; i++) {
    const m1 = 1.0001 * (1000 / 1.0001) ** ((i / samples) ** 2)
    const max = maxDeflection(m1, gamma)
    if (max.ok) points.push({ thetaDeg: max.value.thetaMaxDeg, betaDeg: max.value.betaDeg })
  }
  return points
}

/** θ axis upper end: the largest possible deflection (M1 → ∞) rounded up to 5°. */
export function thetaAxisMax(gamma: number): number {
  const max = maxDeflection(1e4, gamma)
  return max.ok ? Math.ceil((max.value.thetaMaxDeg + 1) / 5) * 5 : 50
}

/** Index of the point nearest to `target` (both in the same, e.g. pixel, coordinates). */
export function nearestIndex(
  points: readonly { readonly x: number; readonly y: number }[],
  target: { readonly x: number; readonly y: number },
): number {
  let best = 0
  let bestD = Infinity
  points.forEach((p, i) => {
    const d = (p.x - target.x) ** 2 + (p.y - target.y) ** 2
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return best
}
