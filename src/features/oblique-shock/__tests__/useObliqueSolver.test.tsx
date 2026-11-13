// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useObliqueSolver } from '../useObliqueSolver'

afterEach(() => window.history.replaceState(null, '', '/'))

const at = (search: string) => {
  window.history.replaceState(null, '', `/${search}`)
  return renderHook(() => useObliqueSolver())
}

describe('useObliqueSolver', () => {
  it('defaults to M1 = 2, weak shock, θ = 10°', () => {
    const { result } = at('')
    expect(result.current.solution.kind).toBe('attached')
    expect(result.current.m1).toBe(2)
  })

  it('keeps the solved M1 while a new M1 is being typed after a detached result', () => {
    const { result } = at('?ob.v=25')
    expect(result.current.solution.kind).toBe('detached')
    act(() => result.current.setM1Text('0.8'))
    expect(result.current.error?.field).toBe('m1')
    expect(result.current.m1).toBe(2)
    expect(result.current.inputThetaDeg).toBe(25)
  })

  it('parses a decimal-comma θ for the detached drawing', () => {
    const { result } = at('?ob.v=25,5')
    expect(result.current.inputThetaDeg).toBe(25.5)
  })

  it('writes a drag on the θ-β-M curve back to the URL in the person’s input kind', () => {
    const { result } = at('?ob.k=thetaWeak&ob.v=10')
    act(() => result.current.setBeta(80))
    expect(result.current.kind).toBe('thetaStrong')
    expect(window.location.search).toContain('ob.k=thetaStrong')
    expect(result.current.solution.kind === 'attached' && result.current.solution.state.betaDeg).toBeCloseTo(80, 1)
  })

  it('converts the value when switching between β and θ inputs', () => {
    const { result } = at('?ob.k=thetaWeak&ob.v=10')
    act(() => result.current.setKind('beta'))
    expect(Number(result.current.valueText)).toBeCloseTo(39.3139, 3)
  })
})
