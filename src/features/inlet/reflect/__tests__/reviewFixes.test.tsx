// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { InletCalculator } from '@/features/inlet/InletCalculator'
import { useRamps } from '@/features/inlet/ramps/useRamps'
import { nudgeReflect } from '../geometry'
import { solveReflect } from '../model'
import { useReflect } from '../useReflect'

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

const at = (search: string) => window.history.replaceState(null, '', `/${search}`)
const param = (key: string) => new URLSearchParams(window.location.search).get(key)

describe('reflect review fixes', () => {
  it('reports the shock cap honestly instead of claiming the walls met', () => {
    const r = solveReflect({ m1: 4, thetaDeg: 0.5, height: 0.05, length: 20 }, 1.4)
    if (!r.ok) throw new Error(r.error.message)
    expect(r.value.shocks).toHaveLength(100)
    expect(r.value.stop.kind).toBe('shockLimit')
  })

  it('only lets shock 1’s θ-β-M point set the ramp angle', () => {
    at('?calc=inlet&in.mode=reflect')
    const { result } = renderHook(() => useReflect())
    act(() => result.current.setThetaFromBeta(2, 40))
    expect(param('rf.t')).toBeNull()
    act(() => result.current.setThetaFromBeta(0, 30))
    expect(Number(param('rf.t'))).toBeCloseTo(12.77, 1)
  })

  it('never steps a handle the wrong way when its value is below the handle minimum', () => {
    expect(nudgeReflect('length', 0.1, 'ArrowLeft', false)).toBe(0.1)
    expect(nudgeReflect('length', 0.1, 'ArrowRight', false)).toBe(0.2)
    expect(nudgeReflect('height', 0.01, 'ArrowDown', false)).toBe(0.01)
  })

  it('works the channel-end handle on the effective length when the walls meet first', () => {
    at('?calc=inlet&in.mode=reflect&rf.t=15&rf.l=5')
    render(<InletCalculator />)
    const handle = screen.getByRole('slider', { name: 'Channel end handle' })
    expect(Number(handle.getAttribute('aria-valuenow'))).toBeCloseTo(3.732, 3)
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(Number(param('rf.l'))).toBeCloseTo(3.632, 3)
  })

  it('labels the shared column as flow direction, not wall angle', () => {
    at('?calc=inlet&in.mode=reflect')
    render(<InletCalculator />)
    const table = screen.getByRole('table', { name: /regions/i })
    expect(within(table).getByRole('columnheader', { name: 'flow (°)' })).toBeTruthy()
    expect(within(table).queryByRole('columnheader', { name: 'wall (°)' })).toBeNull()
    expect(screen.getByRole('button', { name: /^Region 3:/ }).getAttribute('aria-label')).toMatch(/flow 0°/)
  })

  it('keeps the shading choice per mode', () => {
    at('?calc=inlet')
    const { result } = renderHook(() => ({ reflect: useReflect(), ramps: useRamps() }))
    act(() => result.current.reflect.setProperty('M'))
    expect(param('rf.prop')).toBe('M')
    expect(result.current.ramps.property).toBe('p0')
  })
})
