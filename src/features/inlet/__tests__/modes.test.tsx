// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { InletCalculator } from '../InletCalculator'

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

const param = (key: string) => new URLSearchParams(window.location.search).get(key)

function regionRows(): HTMLElement[] {
  return within(screen.getByRole('table', { name: /regions/i })).getAllByRole('row').slice(1)
}

describe('Inlet modes', () => {
  it('starts in ramp series with its explanation and the modelling note', () => {
    open()
    expect(screen.getByRole('radio', { name: 'Ramp series' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('External compression: the shocks focus toward the cowl lip.')).toBeTruthy()
    expect(screen.getByText(/Shock–boundary-layer interaction at reflections is ignored/)).toBeTruthy()
  })

  it('switches to reflecting shocks, writes the mode, and keeps the ramp inputs', () => {
    open('&in.t=8,9,10')
    fireEvent.click(screen.getByRole('radio', { name: 'Reflecting shocks' }))
    expect(param('in.mode')).toBe('reflect')
    expect(screen.getByText('Internal compression: the shock bounces inside the duct.')).toBeTruthy()
    expect(param('in.t')).toBe('8,9,10')
    fireEvent.click(screen.getByRole('radio', { name: 'Ramp series' }))
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: /ramp 2 angle/ }).value).toBe('9')
  })
})

describe('Reflecting shocks view', () => {
  it('shows the default chain: five regions ending at p0/p01 0.912…', () => {
    open('&in.mode=reflect')
    const rows = regionRows()
    expect(rows).toHaveLength(5)
    expect(within(rows[4]!).getAllByRole('cell')[7]?.textContent).toMatch(/^0\.912/)
  })

  it('explains that regular reflection fails and a Mach reflection forms', () => {
    open('&in.mode=reflect')
    const notes = screen.getAllByRole('status').map((s) => s.textContent ?? '')
    expect(notes.some((t) => /regular reflection impossible: a Mach reflection forms here \(not modeled\)/i.test(t))).toBe(true)
    expect(notes.some((t) => /θmax = 8\.67°/.test(t))).toBe(true)
  })

  it('steps the ramp angle with the arrow keys on its handle', () => {
    open('&in.mode=reflect')
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Ramp angle handle' }), { key: 'ArrowUp' })
    expect(param('rf.t')).toBe('10.5')
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Cowl height handle' }), { key: 'ArrowUp' })
    expect(param('rf.h')).toBe('1.05')
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Channel end handle' }), { key: 'ArrowLeft' })
    expect(param('rf.l')).toBe('4.9')
  })

  it('reports a bow shock at the leading edge (Review Focus 5)', () => {
    open('&in.mode=reflect&rf.m=1.5&rf.t=15')
    const notes = screen.getAllByRole('status').map((s) => s.textContent ?? '')
    expect(notes.some((t) => /bow shock/i.test(t) && /leading edge/i.test(t))).toBe(true)
    expect(notes.some((t) => /Mach reflection forms here/i.test(t))).toBe(false)
    expect(regionRows()).toHaveLength(1)
  })

  it('validates its inputs inline', () => {
    open('&in.mode=reflect&rf.h=0')
    expect(screen.getByText('H must be greater than 0 and at most 5')).toBeTruthy()
  })

  it('shows any shock with the shared shock detail', () => {
    open('&in.mode=reflect')
    fireEvent.click(screen.getByRole('radio', { name: 'Shock 2' }))
    expect(param('rf.sel')).toBe('2')
    expect(screen.getByRole('region', { name: /shock 2 detail/i }).textContent).toContain('M₁ = 2.505')
  })
})
