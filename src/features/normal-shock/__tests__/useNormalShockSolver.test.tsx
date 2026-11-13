// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useNormalShockSolver } from '../useNormalShockSolver'

afterEach(() => window.history.replaceState(null, '', '/'))

describe('useNormalShockSolver', () => {
  it('solves from the URL and converts on kind change', () => {
    window.history.replaceState(null, '', '/?ns.k=m1&ns.v=3')
    const { result } = renderHook(() => useNormalShockSolver())
    expect(result.current.state.p2P1).toBeCloseTo(10.333, 3)
    act(() => result.current.setKind('p2P1'))
    expect(result.current.valueText).toBe('10.3333')
    expect(result.current.state.m1).toBeCloseTo(3, 4)
  })

  it('reports value errors without losing the last state', () => {
    const { result } = renderHook(() => useNormalShockSolver())
    act(() => result.current.setValueText('0.5'))
    expect(result.current.error?.field).toBe('value')
    expect(result.current.state.m1).toBe(2)
  })
})
