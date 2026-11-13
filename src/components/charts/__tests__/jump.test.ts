import { describe, expect, it } from 'vitest'
import { jumpDomain } from '../jump'

describe('jumpDomain', () => {
  it('always includes 1 (the upstream reference) with padding on both sides', () => {
    const [lo, hi] = jumpDomain([4.5, 2.67, 1.69, 0.72])
    expect(lo).toBeLessThan(0.72)
    expect(hi).toBeGreaterThan(4.5)
  })

  it('stays a usable range when every ratio is 1 (M1 = 1)', () => {
    const [lo, hi] = jumpDomain([1, 1, 1, 1])
    expect(lo).toBeLessThan(1)
    expect(hi).toBeGreaterThan(1)
  })

  it('ignores non-finite ratios', () => {
    const [lo, hi] = jumpDomain([2, Number.NaN])
    expect(Number.isFinite(lo) && Number.isFinite(hi)).toBe(true)
  })
})
