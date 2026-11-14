import { describe, expect, it } from 'vitest'
import { compareSingle, DEFAULT_RAMPS, solveChain } from '../model'
import { recoverySteps, singleSteps } from '../recovery'

describe('recovery steps', () => {
  it('steps down once per shock for the default chain', () => {
    const chain = solveChain(3, DEFAULT_RAMPS, 1.4)
    if (!chain.ok) throw new Error('chain')
    const steps = recoverySteps(chain.value)
    expect(steps.map((s) => s.station)).toEqual([0, 1, 2, 3])
    ;[1, 0.97993, 0.96596, 0.95595].forEach((v, i) => expect(steps[i]!.p0P01).toBeCloseTo(v, 5))
  })

  it('stops at a detached ramp', () => {
    const chain = solveChain(2, [15, 15, 15].map((thetaDeg) => ({ thetaDeg, length: 1 })), 1.4)
    if (!chain.ok) throw new Error('chain')
    expect(recoverySteps(chain.value)).toHaveLength(2)
  })

  it('gives the single shock one step, or null when it detaches', () => {
    const single = compareSingle(3, DEFAULT_RAMPS, 1.4)
    if (!single.ok) throw new Error('single')
    const steps = singleSteps(single.value)
    expect(steps?.map((s) => s.station)).toEqual([0, 1])
    expect(steps?.[1]?.p0P01).toBeCloseTo(0.70341, 5)
    const detached = compareSingle(3, [10, 10, 10, 10].map((thetaDeg) => ({ thetaDeg, length: 1 })), 1.4)
    if (!detached.ok) throw new Error('detached')
    expect(singleSteps(detached.value)).toBeNull()
  })
})
