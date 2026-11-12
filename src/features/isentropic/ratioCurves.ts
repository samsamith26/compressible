import { isentropicFromMach } from '@/physics'

export type CurveKey = 'aAStar' | 'tT0' | 'rhoRho0' | 'pP0'

export const CURVE_KEYS: readonly CurveKey[] = ['aAStar', 'tT0', 'rhoRho0', 'pP0']

const M_START = 0.02
const NICE_MAX = [4, 10, 20, 50, 100, 200, 500, 1000]

/** Upper end of the Mach axis: the first nice value comfortably above `mach`. */
export function machAxisMax(mach: number): number {
  return NICE_MAX.find((m) => m >= mach * 1.15) ?? 10 ** Math.ceil(Math.log10(mach * 1.15))
}

export interface RatioCurves {
  readonly machs: readonly number[]
  readonly values: Readonly<Record<CurveKey, readonly number[]>>
  /** Log-axis domain covering the ratios at the right end of the axis. */
  readonly yDomain: readonly [number, number]
}

/** Sample the isentropic ratios from M = 0.02 to `machMax` for plotting. */
export function ratioCurves(gamma: number, machMax: number, samples = 240): RatioCurves {
  const machs: number[] = []
  const values: Record<CurveKey, number[]> = { aAStar: [], tT0: [], rhoRho0: [], pP0: [] }
  for (let i = 0; i <= samples; i++) {
    const mach = M_START + ((machMax - M_START) * i) / samples
    const state = isentropicFromMach(mach, gamma)
    if (!state.ok) continue
    machs.push(mach)
    for (const key of CURVE_KEYS) values[key].push(state.value[key])
  }
  const last = (key: CurveKey): number => values[key].at(-1) ?? 1
  const lo = Math.min(0.01, last('pP0') / 2)
  const hi = Math.max(10, last('aAStar') * 1.6)
  return { machs, values, yDomain: [lo, hi] }
}
