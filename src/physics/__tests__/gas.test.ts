import { describe, expect, it } from 'vitest'
import { requireFinite, requireInRange, validateGamma } from '../gas'
import { err, ok } from '../result'

const open01 = { lo: 0, hi: 1, loInclusive: false, hiInclusive: false }

describe('validateGamma', () => {
  it('accepts gamma greater than 1', () => {
    expect(validateGamma(1.4)).toEqual({ ok: true, value: 1.4 })
  })

  it.each([1, 0.9, -2])('rejects gamma = %d with INVALID_GAMMA', (g) => {
    const r = validateGamma(g)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('INVALID_GAMMA')
  })

  it('rejects NaN gamma with NOT_FINITE', () => {
    const r = validateGamma(NaN)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('NOT_FINITE')
  })
})

describe('requireFinite', () => {
  it.each([Infinity, -Infinity, NaN])('rejects %d and names the quantity', (x) => {
    const r = requireFinite('M', x)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe('NOT_FINITE')
      expect(r.error.message).toContain('M')
    }
  })

  it('passes finite values through', () => {
    expect(requireFinite('M', 2)).toEqual({ ok: true, value: 2 })
  })
})

describe('requireInRange', () => {
  it('reports OUT_OF_RANGE with bounds', () => {
    const r = requireInRange('p/p0', 1.2, open01)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe('OUT_OF_RANGE')
      expect(r.error.bounds).toEqual([0, 1])
      expect(r.error.message).toContain('p/p0')
    }
  })

  it('checks finiteness before range', () => {
    const r = requireInRange('p/p0', NaN, open01)
    expect(!r.ok && r.error.code).toBe('NOT_FINITE')
  })

  it('respects exclusive endpoints', () => {
    expect(requireInRange('x', 0, open01).ok).toBe(false)
    expect(requireInRange('x', 1, open01).ok).toBe(false)
    expect(requireInRange('x', 0.5, open01)).toEqual({ ok: true, value: 0.5 })
  })

  it('respects inclusive endpoints', () => {
    const closed = { lo: 0, hi: 1, loInclusive: true, hiInclusive: true }
    expect(requireInRange('x', 0, closed).ok).toBe(true)
    expect(requireInRange('x', 1, closed).ok).toBe(true)
    expect(requireInRange('x', 1.0001, closed).ok).toBe(false)
    expect(requireInRange('x', -0.0001, closed).ok).toBe(false)
  })

  it('accepts an infinite upper bound', () => {
    const atLeastOne = { lo: 1, hi: Infinity, loInclusive: true, hiInclusive: false }
    expect(requireInRange('A/A*', 1e9, atLeastOne).ok).toBe(true)
    const r = requireInRange('A/A*', 0.5, atLeastOne)
    expect(!r.ok && r.error.message).toBe('A/A* must be at least 1')
  })

  it('words an exclusive open-ended bound as "greater than"', () => {
    const positive = { lo: 0, hi: Infinity, loInclusive: false, hiInclusive: false }
    const r = requireInRange('M', 0, positive)
    expect(!r.ok && r.error.message).toBe('M must be greater than 0')
  })

  it('formats non-integer bounds to 6 significant figures', () => {
    const range = { lo: Math.sqrt(1 / 7), hi: 1, loInclusive: false, hiInclusive: true }
    const r = requireInRange('M2', 0.1, range)
    expect(!r.ok && r.error.message).toBe('M2 must be between 0.377964 and 1')
  })
})

describe('result constructors', () => {
  it('builds ok and err values', () => {
    expect(ok(3)).toEqual({ ok: true, value: 3 })
    expect(err('NO_BRACKET', 'no root')).toEqual({
      ok: false,
      error: { code: 'NO_BRACKET', message: 'no root' },
    })
  })
})
