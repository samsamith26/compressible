import { describe, expect, it } from 'vitest'
import { decadeTicks } from '../ticks'

describe('decadeTicks', () => {
  it('lists the decades inside the range', () => {
    expect(decadeTicks(0.002, 150).map((t) => t.label)).toEqual(['0.01', '0.1', '1', '10', '100'])
  })
  it('uses ×10ⁿ labels for far decades', () => {
    expect(decadeTicks(1e-5, 1e-3).map((t) => t.label)).toEqual(['1×10⁻⁵', '1×10⁻⁴', '0.001'])
  })
})
