import { describe, expect, it } from 'vitest'
import { spreadLabels } from '../spreadLabels'

describe('spreadLabels', () => {
  it('leaves well-separated labels alone', () => {
    expect(spreadLabels([10, 50, 100], 12)).toEqual([10, 50, 100])
  })
  it('separates overlapping labels by at least the gap, keeping order', () => {
    const out = spreadLabels([40, 42, 100], 12)
    expect((out[1] ?? 0) - (out[0] ?? 0)).toBeCloseTo(12, 10)
    expect(out[2]).toBeCloseTo(100 - 10 / 3, 10)
  })
  it('works for unsorted input', () => {
    const out = spreadLabels([42, 40], 12)
    expect((out[0] ?? 0) - (out[1] ?? 0)).toBeCloseTo(12, 10)
  })
})
