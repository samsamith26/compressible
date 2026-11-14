import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/lib/contrast'
import { DEFAULT_RAMPS, singleRampLayout, solveChain } from '../model'
import { labelInk, mix, SHADE_STOPS, shadeColor, shadeDomain, shadeValue } from '../shade'

function luminanceOrder(hexes: string[]): number[] {
  return hexes.map((h) => contrastRatio(h, '#000000'))
}

describe('shading', () => {
  it('reads each property from a region', () => {
    const chain = solveChain(3, DEFAULT_RAMPS, 1.4)
    if (!chain.ok) throw new Error('chain')
    const r = chain.value.regions[3]!
    expect(shadeValue(r, 'M')).toBe(r.mach)
    expect(shadeValue(r, 'p')).toBe(r.pP1)
    expect(shadeValue(r, 'T')).toBe(r.tT1)
    expect(shadeValue(r, 'p0')).toBe(r.p0P01)
  })

  it('mixes hex colours channel by channel', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mix('#102030', '#102030', 0.3)).toBe('#102030')
  })

  it('runs light to dark in light mode and dark to light in dark mode, monotonically', () => {
    const light = [0, 0.25, 0.5, 0.75, 1].map((v) => shadeColor(v, [0, 1], 'light'))
    const dark = [0, 0.25, 0.5, 0.75, 1].map((v) => shadeColor(v, [0, 1], 'dark'))
    const l = luminanceOrder(light)
    const d = luminanceOrder(dark)
    for (let i = 1; i < 5; i++) {
      expect(l[i]!).toBeLessThan(l[i - 1]!)
      expect(d[i]!).toBeGreaterThan(d[i - 1]!)
    }
    expect(light[0]).toBe(SHADE_STOPS.light[0])
    expect(dark[4]).toBe(SHADE_STOPS.dark[1])
  })

  it('uses the middle colour when every value is the same', () => {
    expect(shadeColor(3, [3, 3], 'light')).toBe(mix(SHADE_STOPS.light[0], SHADE_STOPS.light[1], 0.5))
  })

  it('spans the domain over both cases when comparing', () => {
    expect(shadeDomain([0.95, 1], [0.7, 1])).toEqual([0.7, 1])
    expect(shadeDomain([2, 3], [])).toEqual([2, 3])
  })

  it('labels with whichever of ink or paper contrasts more with the fill', () => {
    expect(labelInk(SHADE_STOPS.light[1], 'light')).toBe('var(--paper)')
    expect(labelInk(SHADE_STOPS.light[0], 'light')).toBe('var(--ink)')
    expect(labelInk(SHADE_STOPS.dark[1], 'dark')).toBe('var(--paper)')
  })
})

describe('singleRampLayout', () => {
  it('builds the comparison as one ramp at the total angle and total length', () => {
    const layout = singleRampLayout(3, DEFAULT_RAMPS, 1.4)
    expect(layout?.ramps).toEqual([{ thetaDeg: 24, length: 2 }])
    expect(layout?.chain.regions).toHaveLength(2)
  })

  it('keeps a detached comparison drawable', () => {
    const ramps = [10, 10, 10, 10].map((thetaDeg) => ({ thetaDeg, length: 1 }))
    expect(singleRampLayout(3, ramps, 1.4)?.chain.detachedAt).toBe(1)
  })
})
