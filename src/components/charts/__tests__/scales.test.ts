import { describe, expect, it } from 'vitest'
import { clampToRange, formatTick, niceLogTicks } from '../scales'

describe('clampToRange', () => {
  it('clamps into [lo, hi] and passes values inside through', () => {
    expect(clampToRange(5, [0, 1])).toBe(1)
    expect(clampToRange(-2, [0, 1])).toBe(0)
    expect(clampToRange(0.5, [0, 1])).toBe(0.5)
  })

  it('accepts a reversed range', () => {
    expect(clampToRange(5, [1, 0])).toBe(1)
  })

  it('maps NaN to the low end so a marker never disappears', () => {
    expect(clampToRange(Number.NaN, [0, 1])).toBe(0)
  })
})

describe('niceLogTicks', () => {
  it('returns the powers of ten inside the domain', () => {
    expect(niceLogTicks(0.3, 2000)).toEqual([1, 10, 100, 1000])
    expect(niceLogTicks(0.01, 1)).toEqual([0.01, 0.1, 1])
  })

  it('adds 2× and 5× ticks when fewer than three powers of ten fit', () => {
    expect(niceLogTicks(0.45, 8.55)).toEqual([0.5, 1, 2, 5])
  })

  it('thins out ticks across many decades', () => {
    const ticks = niceLogTicks(1e-6, 1e6)
    expect(ticks.length).toBeLessThanOrEqual(7)
    expect(ticks).toContain(1)
  })
})

describe('formatTick', () => {
  it.each([
    [10, '10'],
    [100, '100'],
    [1, '1'],
    [0.2, '0.2'],
    [0.01, '0.01'],
    [0, '0'],
    [2.5, '2.5'],
    [1e6, '10⁶'],
    [1e-5, '10⁻⁵'],
  ])('%d → %s', (v, s) => {
    expect(formatTick(v)).toBe(s)
  })
})
