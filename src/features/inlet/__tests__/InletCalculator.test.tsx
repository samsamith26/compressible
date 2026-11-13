// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CALCULATORS } from '@/hooks/useCalculatorTab'
import { InletCalculator } from '../InletCalculator'

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

function open(search = '') {
  window.history.replaceState(null, '', `/?calc=inlet${search}`)
  return render(<InletCalculator />)
}

function regionRows(): HTMLElement[] {
  const table = screen.getByRole('table', { name: /regions/i })
  return within(table).getAllByRole('row').slice(1)
}

function cell(row: HTMLElement, column: number): string {
  return within(row).getAllByRole('cell')[column]?.textContent ?? ''
}

describe('InletCalculator', () => {
  it('is registered as the fourth calculator tab', () => {
    expect(CALCULATORS.map((c) => c.id)).toEqual(['isentropic', 'normal', 'oblique', 'inlet'])
  })

  it('shows one table row per region for the default three-ramp inlet', () => {
    open()
    const rows = regionRows()
    expect(rows).toHaveLength(4)
    // Columns: M, β, θ, wall, p/p₁, ρ/ρ₁, T/T₁, p₀/p₀₁ (the region number is the row header).
    expect(cell(rows[3]!, 7)).toBe('0.95595')
    expect(cell(rows[0]!, 1)).toBe('—')
  })

  it('updates live when a ramp angle is typed', () => {
    open()
    const before = cell(regionRows()[2]!, 0)
    fireEvent.change(screen.getByRole('textbox', { name: /ramp 2 angle/ }), { target: { value: '10' } })
    expect(cell(regionRows()[2]!, 0)).not.toBe(before)
    expect(window.location.search).toContain('in.t=8%2C10%2C8')
  })

  it('adds a ramp and disables Add at four', () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Add ramp' }))
    expect(regionRows()).toHaveLength(5)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Add ramp' }).disabled).toBe(true)
  })

  it('removes a ramp but not the last one', () => {
    open('&in.t=8&in.l=1')
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Remove ramp 1' }).disabled).toBe(true)
  })

  it('reports a detached first ramp and stops the chain (Review Focus 5)', () => {
    open('&in.m=2&in.t=40&in.l=1')
    const status = screen.getAllByRole('status').find((s) => /detached/.test(s.textContent ?? ''))
    expect(status?.textContent).toMatch(/Shock 1 is detached/)
    expect(status?.textContent).toMatch(/θmax = 22\.97°/)
    expect(regionRows()).toHaveLength(1)
  })

  it('shows a field error under the ramp that caused it', () => {
    open('&in.l=1,0,0.4')
    const field = screen.getByRole('textbox', { name: /ramp 2 length/ })
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Ramp 2 length must be greater than 0')).toBeTruthy()
  })
})
