import { describe, expect, it } from 'vitest'
import { solveOblique, type ObliqueShockState } from '@/physics'
import { compareSingle, DEFAULT_RAMPS, solveChain, totalTurn, type Chain, type Ramp } from '../model'

function chainOf(m1: number, ramps: readonly Ramp[], gamma = 1.4): Chain {
  const r = solveChain(m1, ramps, gamma)
  if (!r.ok) throw new Error(r.error.message)
  return r.value
}

function standalone(m: number, theta: number, gamma: number): ObliqueShockState {
  const r = solveOblique(m, { kind: 'thetaWeak', value: theta }, gamma)
  if (!r.ok || r.value.kind !== 'attached') throw new Error('expected an attached shock')
  return r.value.state
}

describe('solveChain', () => {
  it.each([
    { m1: 3, ramps: DEFAULT_RAMPS, gamma: 1.4 },
    { m1: 2.5, ramps: [{ thetaDeg: 5, length: 1 }, { thetaDeg: 12, length: 1 }], gamma: 1.3 },
  ])('each region matches a standalone solveOblique call (M1 $m1, γ $gamma)', ({ m1, ramps, gamma }) => {
    const chain = chainOf(m1, ramps, gamma)
    expect(chain.detachedAt).toBeNull()
    let p = 1
    let rho = 1
    let t = 1
    let p0 = 1
    ramps.forEach((ramp, i) => {
      const shock = chain.shocks[i]
      if (shock?.kind !== 'attached') throw new Error('expected attached')
      const ref = standalone(chain.regions[i]!.mach, ramp.thetaDeg, gamma)
      expect(shock.state).toEqual(ref)
      p *= ref.p2P1
      rho *= ref.rho2Rho1
      t *= ref.t2T1
      p0 *= ref.p02P01
      const next = chain.regions[i + 1]!
      expect(next.mach).toBe(ref.m2)
      expect(next.betaDeg).toBe(ref.betaDeg)
      expect(next.pP1).toBeCloseTo(p, 12)
      expect(next.rhoRho1).toBeCloseTo(rho, 12)
      expect(next.tT1).toBeCloseTo(t, 12)
      expect(next.p0P01).toBeCloseTo(p0, 12)
    })
  })

  it('reproduces the default example: M1 = 3, three 8° ramps', () => {
    const chain = chainOf(3, DEFAULT_RAMPS)
    expect(chain.regions.map((r) => r.index)).toEqual([1, 2, 3, 4])
    const machs = chain.regions.map((r) => r.mach)
    ;[3, 2.6031, 2.2595, 1.9529].forEach((m, i) => expect(machs[i]).toBeCloseTo(m, 4))
    expect(chain.regions[3]!.p0P01).toBeCloseTo(0.95595, 5)
    expect(chain.regions[3]!.pP1).toBeCloseTo(4.828, 3)
    expect(chain.regions.map((r) => r.thetaCumDeg)).toEqual([0, 8, 16, 24])
    expect(chain.regions.map((r) => r.thetaLocalDeg)).toEqual([0, 8, 8, 8])
    expect(chain.regions[0]).toMatchObject({ betaDeg: null, pP1: 1, rhoRho1: 1, tT1: 1, p0P01: 1 })
  })

  it('stops the chain at a detached ramp', () => {
    const ramps = [15, 15, 15].map((thetaDeg) => ({ thetaDeg, length: 1 }))
    const chain = chainOf(2, ramps)
    expect(chain.detachedAt).toBe(2)
    expect(chain.regions).toHaveLength(2)
    expect(chain.shocks).toHaveLength(2)
    const second = chain.shocks[1]
    expect(second?.kind).toBe('detached')
    expect(second?.upstreamMach).toBeCloseTo(1.4457, 4)
    expect(second?.max.thetaMaxDeg).toBeCloseTo(10.67, 2)
  })

  it('treats θ = 0 as a Mach wave with no change', () => {
    const chain = chainOf(2, [{ thetaDeg: 0, length: 1 }])
    expect(chain.regions[1]!.mach).toBeCloseTo(2, 12)
    expect(chain.regions[1]!.p0P01).toBeCloseTo(1, 12)
  })

  it('passes physics errors through and rejects an empty ramp list', () => {
    const bad = solveChain(0.8, DEFAULT_RAMPS, 1.4)
    expect(bad.ok).toBe(false)
    const none = solveChain(3, [], 1.4)
    expect(!none.ok && none.error.message).toBe('Add at least one ramp')
    const negative = solveChain(3, [{ thetaDeg: -2, length: 1 }], 1.4)
    expect(negative.ok).toBe(false)
  })
})

describe('compareSingle', () => {
  it('turns through the total angle in one shock', () => {
    expect(totalTurn(DEFAULT_RAMPS)).toBe(24)
    const single = compareSingle(3, DEFAULT_RAMPS, 1.4)
    expect(single.ok && single.value.kind === 'attached' && single.value.state.p02P01).toBeCloseTo(0.70341, 5)
    const chain = chainOf(3, DEFAULT_RAMPS)
    const singleP0 = single.ok && single.value.kind === 'attached' ? single.value.state.p02P01 : 1
    expect(chain.regions[3]!.p0P01 - singleP0).toBeGreaterThan(0.2)
  })

  it('reports detachment when the chain is attached but the single turn is not (Review Focus 3)', () => {
    const ramps = [10, 10, 10, 10].map((thetaDeg) => ({ thetaDeg, length: 1 }))
    expect(chainOf(3, ramps).regions).toHaveLength(5)
    const single = compareSingle(3, ramps, 1.4)
    expect(single.ok && single.value.kind).toBe('detached')
  })
})
