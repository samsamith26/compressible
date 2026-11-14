import type { ObliqueSolution } from '@/physics'
import type { Chain } from './model'

/** Total-pressure recovery after each shock. Station 0 is the freestream; station k follows shock k. */
export interface RecoveryStep {
  readonly station: number
  readonly p0P01: number
}

/** One step per attached shock; a detached ramp ends the list. */
export function recoverySteps(chain: Chain): RecoveryStep[] {
  return chain.regions.map((r) => ({ station: r.index - 1, p0P01: r.p0P01 }))
}

/** The single-shock comparison: one step, or null when that turn detaches. */
export function singleSteps(single: ObliqueSolution): RecoveryStep[] | null {
  return single.kind === 'attached'
    ? [
        { station: 0, p0P01: 1 },
        { station: 1, p0P01: single.state.p02P01 },
      ]
    : null
}
