import { describe, expect, it } from 'vitest'
import { densityFill } from '../shade'

function grey(css: string): number {
  return Number(/rgb\((\d+)/.exec(css)?.[1])
}

describe('densityFill', () => {
  it('is brighter for denser gas', () => {
    expect(grey(densityFill(2.67))).toBeGreaterThan(grey(densityFill(1)))
    expect(grey(densityFill(1))).toBeGreaterThan(grey(densityFill(0.23)))
  })

  it('clamps very small and very large ratios', () => {
    expect(densityFill(1e-9)).toBe(densityFill(0.01))
    expect(densityFill(1e9)).toBe(densityFill(10))
  })
})
