// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useInlet } from '../useInlet'

afterEach(() => window.history.replaceState(null, '', '/'))

const at = (search: string) => {
  window.history.replaceState(null, '', `/${search}`)
  return renderHook(() => useInlet())
}

const param = (key: string) => new URLSearchParams(window.location.search).get(key)

describe('useInlet', () => {
  it('defaults to M1 = 3 with three 8° ramps, compare on, shading by p0', () => {
    const { result } = at('?calc=inlet')
    expect(result.current.solution.m1).toBe(3)
    expect(result.current.thetaTexts).toEqual(['8', '8', '8'])
    expect(result.current.lengthTexts).toEqual(['1', '0.6', '0.4'])
    expect(result.current.compare).toBe(true)
    expect(result.current.property).toBe('p0')
    expect(result.current.selected).toBe(1)
  })

  it('reads M1 from the URL and writes one ramp angle back', () => {
    const { result } = at('?calc=inlet&in.m=2.5')
    expect(result.current.solution.m1).toBe(2.5)
    act(() => result.current.setThetaText(1, '10'))
    expect(param('in.t')).toBe('8,10,8')
  })

  it('adds and removes ramps in both lists', () => {
    const { result } = at('?calc=inlet')
    act(() => result.current.addRamp())
    expect(param('in.t')).toBe('8,8,8,8')
    expect(param('in.l')).toBe('1,0.6,0.4,0.28')
    act(() => result.current.removeRamp(0))
    expect(param('in.t')).toBe('8,8,8')
    expect(param('in.l')).toBe('0.6,0.4,0.28')
  })

  it('keeps the last valid solution while M1 is invalid', () => {
    const { result } = at('?calc=inlet')
    act(() => result.current.setM1Text('abc'))
    expect(result.current.error?.field).toBe('m1')
    expect(result.current.solution.m1).toBe(3)
  })

  it('sets a ramp from a dragged corner with four significant figures', () => {
    const { result } = at('?calc=inlet')
    act(() => result.current.setCorner(1, 9.123456, 0.654321))
    expect(param('in.t')).toBe('8,9.123,8')
    expect(param('in.l')).toBe('1,0.6543,0.4')
  })

  it('sets a ramp from a β picked on the θ-β-M chart, clamped to θmax', () => {
    const { result } = at('?calc=inlet')
    act(() => result.current.setThetaFromBeta(0, 30))
    expect(Number(param('in.t')?.split(',')[0])).toBeCloseTo(12.77, 1)
    act(() => result.current.setThetaFromBeta(0, 89))
    expect(Number(param('in.t')?.split(',')[0])).toBeGreaterThan(0)
  })

  it('clamps the selected shock when ramps are removed', () => {
    const { result } = at('?calc=inlet&in.sel=3')
    expect(result.current.selected).toBe(3)
    act(() => result.current.removeRamp(2))
    expect(result.current.selected).toBe(2)
  })

  it('stores the shading property and comparison toggle', () => {
    const { result } = at('?calc=inlet&in.prop=nope')
    expect(result.current.property).toBe('p0')
    act(() => result.current.setProperty('M'))
    act(() => result.current.setCompare(false))
    expect(param('in.prop')).toBe('M')
    expect(param('in.cmp')).toBe('0')
    expect(result.current.compare).toBe(false)
  })
})

describe('useInlet list encoding', () => {
  it('writes a typed decimal comma as a point so the URL list stays intact', () => {
    const { result } = at('?calc=inlet')
    act(() => result.current.setThetaText(0, '8,5'))
    expect(param('in.t')).toBe('8.5,8,8')
    expect(result.current.thetaTexts).toEqual(['8.5', '8', '8'])
  })
})
