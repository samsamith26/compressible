// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CALCULATORS } from '@/hooks/useCalculatorTab'
import { InletCalculator } from '../InletCalculator'

// jsdom has no layout engine: charts size themselves with ResizeObserver.
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

describe('InletCalculator flow field', () => {
  it('draws one focusable region per chain region', () => {
    open()
    const field = screen.getByRole('group', { name: /flow field/i })
    expect(within(field).getAllByRole('button', { name: /^Region \d/ })).toHaveLength(4)
  })

  it('shows a region tooltip on focus and pins it with Enter', () => {
    open()
    const region2 = screen.getByRole('button', { name: /^Region 2:/ })
    fireEvent.focus(region2)
    expect(screen.getByRole('tooltip').textContent).toMatch(/M\s*2\.6031/)
    fireEvent.keyDown(region2, { key: 'Enter' })
    expect(region2.getAttribute('aria-pressed')).toBe('true')
    fireEvent.blur(region2)
    expect(screen.getByRole('tooltip').textContent).toMatch(/Region 2/)
  })

  it('moves a ramp corner with the arrow keys', () => {
    open()
    const corner = screen.getByRole('slider', { name: /ramp 1 corner/i })
    fireEvent.keyDown(corner, { key: 'ArrowUp' })
    expect(new URLSearchParams(window.location.search).get('in.t')).toBe('8.5,8,8')
    fireEvent.keyDown(corner, { key: 'ArrowRight' })
    expect(new URLSearchParams(window.location.search).get('in.l')).toBe('1.05,0.6,0.4')
  })

  it('flags shocks that cross inside the drawing instead of drawing past them', () => {
    open('&in.l=1,1,1')
    const notes = screen.getAllByRole('status').map((s) => s.textContent ?? '')
    expect(notes.some((t) => /Shocks 1 and 2 cross/.test(t))).toBe(true)
  })

  it('shades by the chosen property with a legend', () => {
    open('&in.prop=M')
    expect(screen.getByText(/Shaded by Mach number/)).toBeTruthy()
  })
})

describe('InletCalculator recovery and comparison', () => {
  it('compares both recoveries and calls out the difference', () => {
    open()
    const chart = screen.getByRole('group', { name: /total-pressure recovery/i })
    expect(within(chart).getByText(/3 ramps 0\.956/)).toBeTruthy()
    expect(within(chart).getByText(/single 24° 0\.703/)).toBeTruthy()
    expect(screen.getByText(/\+0\.253 recovered/)).toBeTruthy()
  })

  it('hides the single-shock series when comparison is off', () => {
    open('&in.cmp=0')
    const chart = screen.getByRole('group', { name: /total-pressure recovery/i })
    expect(within(chart).queryByText(/single 24°/)).toBeNull()
    expect(screen.queryByRole('group', { name: /single-shock comparison/i })).toBeNull()
  })

  it('says when the single turn would detach (Review Focus 3)', () => {
    open('&in.t=10,10,10,10&in.l=1,0.6,0.4,0.3')
    expect(screen.getByText(/A single 40° turn detaches at M₁ = 3 \(θmax 34\.07°\)/)).toBeTruthy()
  })
})

describe('InletCalculator shock detail', () => {
  it('selects a shock and shows its upstream Mach number and angle', () => {
    open()
    fireEvent.click(screen.getByRole('radio', { name: 'Shock 2' }))
    expect(new URLSearchParams(window.location.search).get('in.sel')).toBe('2')
    const detail = screen.getByRole('region', { name: /shock 2 detail/i })
    expect(detail.textContent).toContain('M₁ = 2.603')
    expect(detail.textContent).toContain('θ = 8°')
  })

  it('reuses the θ-β-M point: a key press there edits that ramp', () => {
    open('&in.sel=2')
    const point = screen.getByRole('slider', { name: /wave angle β/i })
    fireEvent.keyDown(point, { key: 'ArrowUp' })
    const thetas = new URLSearchParams(window.location.search).get('in.t')?.split(',') ?? []
    expect(thetas[0]).toBe('8')
    expect(Number(thetas[1])).toBeGreaterThan(8)
  })

  it('shows the detached view for a detached shock', () => {
    open('&in.m=2&in.t=15,15,15&in.l=1,1,1&in.sel=2')
    const detail = screen.getByRole('region', { name: /shock 2 detail/i })
    expect(detail.textContent).toMatch(/detached/i)
  })
})
