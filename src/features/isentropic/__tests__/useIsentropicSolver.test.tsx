// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useIsentropicSolver } from '../useIsentropicSolver'

afterEach(() => window.history.replaceState(null, '', '/'))

describe('useIsentropicSolver', () => {
  it('reads inputs from the URL and solves', () => {
    window.history.replaceState(null, '', '/?iso.k=pP0&iso.v=0.12780452&g=1.4')
    const { result } = renderHook(() => useIsentropicSolver())
    expect(result.current.state.mach).toBeCloseTo(2, 6)
  })

  it('keeps the last valid state and reports the field while input is invalid', () => {
    window.history.replaceState(null, '', '/?iso.v=3')
    const { result } = renderHook(() => useIsentropicSolver())
    act(() => result.current.gamma.setText('0.9'))
    expect(result.current.error?.field).toBe('gamma')
    expect(result.current.state.mach).toBe(3)
  })

  it('converts the value when the input kind changes', () => {
    const { result } = renderHook(() => useIsentropicSolver())
    act(() => result.current.setKind('pP0'))
    expect(result.current.valueText).toBe('0.127805')
    expect(result.current.state.mach).toBeCloseTo(2, 4)
  })

  it('maps a chart drag back into the chosen kind', () => {
    window.history.replaceState(null, '', '/?iso.k=areaSup&iso.v=1.6875')
    const { result } = renderHook(() => useIsentropicSolver())
    act(() => result.current.setMach(0.5))
    expect(result.current.kind).toBe('areaSub')
    expect(result.current.state.mach).toBeCloseTo(0.5, 3)
  })
})
