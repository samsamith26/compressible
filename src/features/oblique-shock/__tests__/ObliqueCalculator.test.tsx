// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ObliqueCalculator } from '../ObliqueCalculator'

function input(name: string): HTMLInputElement {
  const el = screen.getByLabelText(name)
  if (!(el instanceof HTMLInputElement)) throw new Error(`${name} is not an input`)
  return el
}

function cells(row: string): string[] {
  const table = screen.getByRole('table', { name: /weak and strong/i })
  return within(within(table).getByRole('row', { name: row }))
    .getAllByRole('cell')
    .map((c) => c.textContent ?? '')
}

describe('ObliqueCalculator', () => {
  it('shows upstream, weak and strong side by side', () => {
    render(<ObliqueCalculator initial={{}} onParamsChange={() => {}} />)
    expect(cells('β (°)')).toEqual(['—', '39.314', '83.700'])
    expect(cells('M')[0]).toBe('2.0000')
  })

  it('updates live when M1 changes', () => {
    render(<ObliqueCalculator initial={{}} onParamsChange={() => {}} />)
    fireEvent.change(input('M1'), { target: { value: '3' } })
    expect(cells('β (°)')[1]).toBe('27.383')
  })

  it('explains detachment as a status, not an error', () => {
    render(<ObliqueCalculator initial={{ kind: 'thetaWeak', value: '30' }} onParamsChange={() => {}} />)
    const status = screen.getByRole('status')
    expect(status.textContent).toMatch(/Shock detached/)
    expect(status.textContent).toMatch(/22\.97°/)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('steps the θ-β-M operating point with the keyboard, keeping a turn-angle input', () => {
    const onParamsChange = vi.fn()
    render(<ObliqueCalculator initial={{}} onParamsChange={onParamsChange} />)
    const slider = screen.getByRole('slider', { name: /wave angle/i })
    expect(slider.getAttribute('aria-valuetext')).toMatch(/β 39\.3°, θ 10\.0°/)
    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true })
    const last = onParamsChange.mock.lastCall?.[0]
    expect(last.kind).toBe('thetaWeak')
    expect(Number(last.value)).toBeGreaterThan(10)
    expect(last.m1).toBe('2')
  })

  it('shows an M1 error next to the M1 field', () => {
    render(<ObliqueCalculator initial={{}} onParamsChange={() => {}} />)
    fireEvent.change(input('M1'), { target: { value: '0.9' } })
    expect(screen.getByRole('alert').textContent).toMatch(/M1 must be/)
  })
})
