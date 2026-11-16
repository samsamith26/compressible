import { describe, expect, it } from 'vitest'
import { solveOblique } from '@/physics'
import { solveReflect, type ReflectInput, type ReflectSolution } from '../model'

function solve(input: Partial<ReflectInput>, gamma = 1.4): ReflectSolution {
  const r = solveReflect({ m1: 3, thetaDeg: 10, height: 1, length: 5, ...input }, gamma)
  if (!r.ok) throw new Error(r.error.message)
  return r.value
}

function finite(s: ReflectSolution): boolean {
  const pts = s.shocks.flatMap((k) => [k.from, k.to])
  return pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) && s.chain.regions.every((r) => Number.isFinite(r.mach))
}

describe('solveReflect: M1 = 2.8, θ = 16°', () => {
  const s = solve({ m1: 2.8, thetaDeg: 16 })

  it('forms the incident shock at the leading edge', () => {
    const first = s.chain.shocks[0]
    expect(first?.kind === 'attached' && first.state.betaDeg).toBeCloseTo(34.92, 2)
    expect(s.chain.regions[1]!.mach).toBeCloseTo(2.059, 3)
    expect(s.shocks[0]!.fromWall).toBe('ramp')
    expect(s.shocks[0]!.from).toEqual({ x: 0, y: 0 })
  })

  it('reflects off the cowl at 29.33° to the cowl', () => {
    const second = s.shocks[1]!
    expect(second.fromWall).toBe('cowl')
    expect(second.from.x).toBeCloseTo(1.432, 3)
    expect(second.from.y).toBe(1)
    expect(second.wallAngleDeg).toBeCloseTo(29.33, 2)
    expect(s.chain.regions[2]!.mach).toBeCloseTo(1.458, 3)
    expect(s.chain.regions[2]!.pP1).toBeCloseTo(6.607, 3)
  })

  it('then finds regular reflection impossible (θmax ≈ 11.0°)', () => {
    expect(s.stop.kind).toBe('machReflection')
    if (s.stop.kind !== 'machReflection') return
    expect(s.stop.thetaMaxDeg).toBeCloseTo(11.0, 2)
    expect(s.stop.at.x).toBeCloseTo(2.127, 3)
    expect(s.stop.at.y).toBeCloseTo(0.61, 3)
  })
})

describe('solveReflect: default M1 = 3, θ = 10°', () => {
  const s = solve({})

  it('gives four shocks, then the reflection fails', () => {
    expect(s.shocks).toHaveLength(4)
    const last = s.chain.regions.at(-1)!
    expect(last.mach).toBeCloseTo(1.373, 3)
    expect(last.pP1).toBeCloseTo(10.945, 3)
    expect(last.p0P01).toBeCloseTo(0.9125, 4)
    expect(s.stop.kind === 'machReflection' && s.stop.thetaMaxDeg).toBeCloseTo(8.67, 2)
  })

  it('alternates walls, and the flow direction between θ and 0', () => {
    expect(s.shocks.map((k) => k.fromWall)).toEqual(['ramp', 'cowl', 'ramp', 'cowl'])
    expect(s.chain.regions.map((r) => r.flowDeg)).toEqual([0, 10, 0, 10, 0])
    expect(s.chain.regions.slice(1).every((r) => r.thetaLocalDeg === 10)).toBe(true)
  })

  it('matches a standalone solveOblique call for every region, chained through', () => {
    let p = 1
    let p0 = 1
    s.chain.shocks.filter((k) => k.kind === 'attached').forEach((link, i) => {
      const ref = solveOblique(s.chain.regions[i]!.mach, { kind: 'thetaWeak', value: 10 }, 1.4)
      if (!ref.ok || ref.value.kind !== 'attached' || link.kind !== 'attached') throw new Error('expected attached')
      expect(link.state).toEqual(ref.value.state)
      p *= ref.value.state.p2P1
      p0 *= ref.value.state.p02P01
      expect(s.chain.regions[i + 1]!.mach).toBe(ref.value.state.m2)
      expect(s.chain.regions[i + 1]!.pP1).toBeCloseTo(p, 12)
      expect(s.chain.regions[i + 1]!.p0P01).toBeCloseTo(p0, 12)
    })
  })

  it('keeps every shock inside the channel', () => {
    expect(s.channelEndX).toBe(5)
    expect(s.meetX).toBeCloseTo(5.671, 3)
    for (const k of s.shocks) expect(k.to.x).toBeLessThanOrEqual(5 + 1e-9)
  })
})

describe('solveReflect: stop conditions', () => {
  it('stops when the next shock would leave the channel', () => {
    const s = solve({ length: 2.5 })
    expect(s.stop.kind).toBe('channelEnd')
    expect(s.shocks).toHaveLength(2)
    expect(s.shocks[1]!.to.x).toBeCloseTo(2.5, 9)
    expect(s.chain.regions).toHaveLength(3)
  })

  it('stops when the walls close in (channel narrower than 1% of H)', () => {
    const s = solve({ m1: 10, thetaDeg: 5, length: 20 })
    expect(s.stop.kind).toBe('wallsMeet')
    expect(s.shocks).toHaveLength(11)
    expect(s.channelEndX).toBeCloseTo(s.meetX, 9)
    expect(finite(s)).toBe(true)
  })

  it('reports a bow shock at the leading edge when θ exceeds θmax at M1 (Review Focus 5)', () => {
    const s = solve({ m1: 1.5, thetaDeg: 15 })
    expect(s.stop.kind).toBe('leadingEdge')
    expect(s.stop.kind === 'leadingEdge' && s.stop.thetaMaxDeg).toBeCloseTo(12.1, 1)
    expect(s.shocks).toHaveLength(0)
    expect(s.chain.regions).toHaveLength(1)
  })

  it('handles a nearly flat ramp (Review Focus 2)', () => {
    const s = solve({ thetaDeg: 0.5, length: 5 })
    expect(s.stop.kind).toBe('channelEnd')
    expect(finite(s)).toBe(true)
  })

  it('handles a tall, short channel: shock 1 leaves before the cowl (Review Focus 3)', () => {
    const s = solve({ height: 5, length: 1 })
    expect(s.stop.kind).toBe('channelEnd')
    expect(s.shocks).toHaveLength(1)
    expect(s.chain.regions).toHaveLength(2)
  })

  it('passes physics errors through', () => {
    expect(solveReflect({ m1: 0.8, thetaDeg: 10, height: 1, length: 5 }, 1.4).ok).toBe(false)
    expect(solveReflect({ m1: 3, thetaDeg: 10, height: 1, length: 5 }, 1).ok).toBe(false)
  })
})
