import { describe, expect, it } from 'vitest'
import { fieldFrame } from '../frame'

describe('fieldFrame', () => {
  const bounds = { x0: -0.3, x1: 1.93, y1: 0.93 }

  it('maps model points to pixels and back', () => {
    const f = fieldFrame(bounds, 600, 360)
    const p = f.toModel(f.toX(1.2), f.toY(0.4))
    expect(p.x).toBeCloseTo(1.2, 9)
    expect(p.y).toBeCloseTo(0.4, 9)
  })

  it('uses equal scales in x and y and fits the height cap', () => {
    const f = fieldFrame(bounds, 1200, 300)
    expect(f.height).toBeLessThanOrEqual(300 + 1e-9)
    expect(f.toX(1) - f.toX(0)).toBeCloseTo(f.toY(0) - f.toY(1), 9)
  })

  it('never lays out narrower than 280 px', () => {
    expect(fieldFrame(bounds, 0, 360).width).toBe(280)
  })
})
