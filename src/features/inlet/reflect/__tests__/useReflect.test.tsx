// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useRamps } from '@/features/inlet/ramps/useRamps'
import { useInletMode } from '@/features/inlet/useInletMode'
import { useReflect } from '../useReflect'

afterEach(() => window.history.replaceState(null, '', '/'))

const at = (search: string) => window.history.replaceState(null, '', `/${search}`)
const param = (key: string) => new URLSearchParams(window.location.search).get(key)

describe('useReflect', () => {
  it('defaults to M1 = 3, θ = 10°, H = 1, L = 5', () => {
    at('?calc=inlet&in.mode=reflect')
    const { result } = renderHook(() => useReflect())
    expect([result.current.m1Text, result.current.thetaText, result.current.heightText, result.current.lengthText]).toEqual(['3', '10', '1', '5'])
    expect(result.current.solution.solution.shocks).toHaveLength(4)
    expect(result.current.selected).toBe(1)
  })

  it('writes its own URL keys, with drag values to four significant figures', () => {
    at('?calc=inlet')
    const { result } = renderHook(() => useReflect())
    act(() => result.current.setThetaText('12'))
    expect(param('rf.t')).toBe('12')
    act(() => result.current.setHeight(1.234567))
    act(() => result.current.setLength(6.789012))
    expect(param('rf.h')).toBe('1.235')
    expect(param('rf.l')).toBe('6.789')
  })

  it('keeps the last valid solution while an input is invalid', () => {
    at('?calc=inlet')
    const { result } = renderHook(() => useReflect())
    act(() => result.current.setHeightText('0'))
    expect(result.current.error?.field).toBe('height')
    expect(result.current.solution.solution.shocks).toHaveLength(4)
  })

  it('sets θ from a β picked for a shock, clamped to that shock’s θmax', () => {
    at('?calc=inlet')
    const { result } = renderHook(() => useReflect())
    act(() => result.current.setThetaFromBeta(0, 30))
    expect(Number(param('rf.t'))).toBeCloseTo(12.77, 1)
  })

  it('clamps the selected shock to the shocks that exist', () => {
    at('?calc=inlet&rf.sel=9')
    const { result } = renderHook(() => useReflect())
    expect(result.current.selected).toBe(5)
  })
})

describe('useInletMode', () => {
  it('defaults to ramp series and writes in.mode', () => {
    at('?calc=inlet')
    const { result } = renderHook(() => useInletMode())
    expect(result.current[0]).toBe('ramps')
    act(() => result.current[1]('reflect'))
    expect(param('in.mode')).toBe('reflect')
  })

  it('keeps each mode’s inputs, valid or not, across switches (Review Focus 1)', () => {
    at('?calc=inlet&in.t=8,9,10')
    const { result } = renderHook(() => ({ mode: useInletMode(), reflect: useReflect(), ramps: useRamps() }))
    act(() => result.current.mode[1]('reflect'))
    act(() => result.current.reflect.setM1Text('abc'))
    act(() => result.current.mode[1]('ramps'))
    act(() => result.current.mode[1]('reflect'))
    expect(result.current.reflect.m1Text).toBe('abc')
    expect(result.current.reflect.error?.field).toBe('m1')
    expect(result.current.ramps.thetaTexts).toEqual(['8', '9', '10'])
    expect(result.current.ramps.error).toBeNull()
  })
})
