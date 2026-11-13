import { describe, expect, it } from 'vitest'
import { normalShock, type NormalShockState } from '@/physics'
import { jumpRows } from '@/components/charts/jump'
import { isNormalKind, NORMAL_KINDS, seedValue, solveNormalText } from '../model'

function ns(m1: number, g = 1.4): NormalShockState {
  const r = normalShock(m1, g)
  if (!r.ok) throw new Error(r.error.message)
  return r.value
}

describe('kinds', () => {
  it('lists the seven VT input kinds in VT order', () => {
    expect(NORMAL_KINDS.map((k) => k.kind)).toEqual(['m1', 'm2', 'p2P1', 'rho2Rho1', 't2T1', 'p02P01', 'p1P02'])
    expect(isNormalKind('t2T1')).toBe(true)
    expect(isNormalKind('mach')).toBe(false)
  })
})

describe('solveNormalText', () => {
  it('solves from any downstream ratio', () => {
    const s = solveNormalText('1.4', 'p2P1', '4.5')
    expect(s.result?.ok && s.result.value.m1).toBeCloseTo(2, 9)
  })

  it('treats half-typed input as pending and garbage as an error', () => {
    expect(solveNormalText('1.4', 'm1', '1e').result).toBeNull()
    expect(solveNormalText('1.4', 'm1', 'two').field).toBe('value')
  })

  it('puts M1 range errors on the value field and γ errors on γ', () => {
    expect(solveNormalText('1.4', 'm1', '0.5').field).toBe('value')
    expect(solveNormalText('0.9', 'm1', '2').field).toBe('gamma')
  })
})

describe('seedValue', () => {
  it('expresses the current state in the new kind', () => {
    expect(seedValue('m2', ns(2))).toBe('0.57735')
    expect(seedValue('p2P1', ns(2))).toBe('4.5')
    expect(seedValue('m1', ns(2))).toBe('2')
  })
})

describe('jumpRows', () => {
  it('lists p, ρ, T and p0 ratios in that order', () => {
    const rows = jumpRows(ns(2))
    expect(rows.map((r) => r.key)).toEqual(['p', 'rho', 't', 'p0'])
    expect(rows[0]?.ratio).toBeCloseTo(4.5, 9)
  })

  it('has p0 falling and the rest rising across a shock', () => {
    const rows = jumpRows(ns(3))
    for (const r of rows) {
      if (r.key === 'p0') expect(r.ratio).toBeLessThan(1)
      else expect(r.ratio).toBeGreaterThan(1)
    }
  })
})
