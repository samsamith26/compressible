import { describe, expect, it } from 'vitest'
import { NORMAL_SHOCK_KINDS, normalShockValue, solveNormalShockText } from '../model'

describe('solveNormalShockText', () => {
  it('solves M1 = 2 at γ = 1.4 (Anderson table A.2)', () => {
    const r = solveNormalShockText('m1', '2', '1.4')
    if (!r.ok) throw new Error(r.error.message)
    expect(r.value.m2).toBeCloseTo(0.5774, 4)
    expect(r.value.p2P1).toBeCloseTo(4.5, 10)
    expect(r.value.p02P01).toBeCloseTo(0.7209, 4)
  })

  it('round-trips every input kind', () => {
    const base = solveNormalShockText('m1', '2.5', '1.3')
    if (!base.ok) throw new Error('setup')
    for (const kind of NORMAL_SHOCK_KINDS) {
      const r = solveNormalShockText(kind, String(normalShockValue(base.value, kind)), '1.3')
      expect(r.ok && r.value.m1).toBeCloseTo(2.5, 8)
    }
  })

  it('reports bad text and physics errors', () => {
    const bad = solveNormalShockText('p2P1', '', '1.4')
    expect(!bad.ok && bad.error.message).toBe('Enter a number for static pressure ratio')
    const g = solveNormalShockText('m1', '2', 'x')
    expect(!g.ok && g.error.message).toBe('Enter a number for γ')
    const low = solveNormalShockText('m1', '0.5', '1.4')
    expect(low.ok).toBe(false)
  })
})
