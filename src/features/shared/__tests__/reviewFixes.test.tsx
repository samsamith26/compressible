// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { isentropicFromMach, maxDeflection } from '@/physics'
import { IsentropicCalculator } from '../../isentropic/IsentropicCalculator'
import { useIsentropic } from '../../isentropic/useIsentropic'
import { useNormalShock } from '../../normal-shock/useNormalShock'
import { dragToInput } from '../../oblique-shock/model'
import { useOblique } from '../../oblique-shock/useOblique'

const noop = () => {}

describe('review fixes', () => {
  it('does not crash while γ is typed through an invalid value (γ = 1)', () => {
    render(<IsentropicCalculator initial={{}} onParamsChange={noop} />)
    expect(() => fireEvent.change(screen.getByLabelText('γ'), { target: { value: '1' } })).not.toThrow()
    expect(screen.getByRole('alert').textContent).toMatch(/γ must be greater than 1/)
    expect(screen.getByRole('group', { name: 'Stagnation ratios' })).toBeTruthy()
  })

  it('chart drags use the last valid γ, never a stand-in', () => {
    const { result } = renderHook(() => useIsentropic({ gamma: '1.4', kind: 'pP0', value: '0.127805' }, noop))
    act(() => result.current.setGamma('1.'))
    act(() => result.current.setMach(3))
    const at14 = isentropicFromMach(3, 1.4)
    expect(at14.ok && Number(result.current.value)).toBeCloseTo(at14.ok ? at14.value.pP0 : NaN, 5)
  })

  it('switching to a kind that cannot express the state clears the value instead of misreading it', () => {
    const { result } = renderHook(() => useIsentropic({ kind: 'mach', value: '0.5' }, noop))
    act(() => result.current.setKind('machAngleDeg'))
    expect(result.current.value).toBe('')
    expect(result.current.valueError).toBeUndefined()

    const ob = renderHook(() => useOblique({ m1: '2', kind: 'thetaWeak', value: '30' }, noop))
    act(() => ob.result.current.setKind('beta'))
    expect(ob.result.current.value).toBe('')
  })

  it('a URL with a kind but no value opens on a valid state for that kind', () => {
    expect(renderHook(() => useIsentropic({ kind: 'pP0' }, noop)).result.current.value).toBe('0.127805')
    expect(renderHook(() => useNormalShock({ kind: 'p02P01' }, noop)).result.current.value).toBe('0.720874')
    const ob = renderHook(() => useOblique({ kind: 'beta' }, noop)).result.current
    expect(ob.value).toBe('39.3139')
    expect(ob.valueError).toBeUndefined()
  })

  it('a dragged turn angle never rounds above θmax', () => {
    for (let m1 = 1.2; m1 <= 10; m1 += 0.137) {
      const max = maxDeflection(m1, 1.4)
      if (!max.ok) throw new Error('max')
      const input = dragToInput('thetaWeak', m1, max.value.betaDeg, 1.4)
      expect(Number(input.value)).toBeLessThanOrEqual(max.value.thetaMaxDeg)
    }
  })
})
