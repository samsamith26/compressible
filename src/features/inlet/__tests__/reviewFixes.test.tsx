// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { InletCalculator } from '../InletCalculator'
import { parseList, solveChain, solveInletText } from '../model'
import { useInlet } from '../useInlet'

if (!('ResizeObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  })
}

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

const at = (search: string) => {
  window.history.replaceState(null, '', `/${search}`)
  return renderHook(() => useInlet())
}
const param = (key: string) => new URLSearchParams(window.location.search).get(key)

describe('review fixes', () => {
  it('stops the chain, without an M1 error, when a shock leaves subsonic flow', () => {
    const chain = solveChain(3, [{ thetaDeg: 34.07, length: 1 }, { thetaDeg: 2, length: 1 }], 1.4)
    expect(chain.ok).toBe(true)
    if (!chain.ok) return
    expect(chain.value.regions[1]!.mach).toBeLessThan(1)
    expect(chain.value.shocks[1]?.kind).toBe('subsonic')
    expect(chain.value.detachedAt).toBe(2)
    const text = solveInletText({ gamma: '1.4', m1: '3', thetas: ['34.07', '2'], lengths: ['1', '1'] })
    expect(text.ok).toBe(true)
  })

  it('keeps a single cleared ramp field as one empty entry instead of resetting to three ramps', () => {
    expect(parseList('', ['8', '8', '8'])).toEqual([''])
    const { result } = at('?calc=inlet&in.t=8&in.l=1')
    act(() => result.current.setThetaText(0, ''))
    expect(result.current.thetaTexts).toEqual([''])
    expect(result.current.error?.field).toBe('theta1')
  })

  it('fills in missing lengths for a shared URL that lists only angles', () => {
    const { result } = at('?calc=inlet&in.t=8,8,8,8')
    expect(result.current.lengthTexts).toEqual(['1', '0.6', '0.4', '0.28'])
    expect(result.current.error).toBeNull()
  })

  it('converts every typed comma so pasted text cannot add ramps', () => {
    const { result } = at('?calc=inlet')
    act(() => result.current.setThetaText(1, '1,2,5'))
    expect(param('in.t')?.split(',')).toHaveLength(3)
    expect(result.current.error?.field).toBe('theta2')
  })

  it('keeps the γ the shown chain was solved with while an input is invalid', () => {
    const { result } = at('?calc=inlet&g=1.3')
    expect(result.current.solution.gamma).toBe(1.3)
    act(() => result.current.setM1Text('abc'))
    act(() => result.current.gamma.setText('1.2'))
    expect(result.current.solution.gamma).toBe(1.3)
  })

  it('does not claim a recovery gain when the chain stopped early', () => {
    window.history.replaceState(null, '', '/?calc=inlet&in.t=8,8,30')
    render(<InletCalculator />)
    expect(screen.queryByText(/recovered/)).toBeNull()
    expect(screen.getByText(/stops at ramp 3 after turning 16° of 46°/)).toBeTruthy()
    expect(screen.getAllByText(/2 of 3 ramps/).length).toBeGreaterThan(0)
  })

  it('lets the angle slider reach 45°, like the corner handle', () => {
    window.history.replaceState(null, '', '/?calc=inlet')
    render(<InletCalculator />)
    expect(screen.getByRole('slider', { name: 'Ramp 1 angle' }).getAttribute('max')).toBe('45')
  })
})
