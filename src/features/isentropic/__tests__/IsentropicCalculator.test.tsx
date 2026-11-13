// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IsentropicCalculator } from '../IsentropicCalculator'

function valueInput(name: string): HTMLInputElement {
  const el = screen.getByLabelText(name)
  if (!(el instanceof HTMLInputElement)) throw new Error(`${name} is not an input`)
  return el
}

function ratioCell(row: string, column: number): string {
  const table = screen.getByRole('table', { name: /ratios/i })
  const r = within(table).getByRole('row', { name: row })
  return within(r).getAllByRole('cell')[column]?.textContent ?? ''
}

describe('IsentropicCalculator', () => {
  it('shows the default state, M = 2', () => {
    render(<IsentropicCalculator initial={{}} onParamsChange={() => {}} />)
    expect(ratioCell('p', 0)).toBe('0.12780')
    expect(screen.getByTestId('mach-headline').textContent).toBe('2.0000')
  })

  it('updates results live as the value is typed', () => {
    render(<IsentropicCalculator initial={{}} onParamsChange={() => {}} />)
    fireEvent.change(valueInput('M'), { target: { value: '3' } })
    expect(ratioCell('p', 0)).toBe('0.027224')
  })

  it('keeps the last valid result, dimmed, while input is invalid', () => {
    render(<IsentropicCalculator initial={{}} onParamsChange={() => {}} />)
    fireEvent.change(valueInput('M'), { target: { value: '-1' } })
    expect(screen.getByRole('alert').textContent).toMatch(/M must be/)
    expect(screen.getByRole('table', { name: /ratios/i }).dataset.stale).toBe('true')
    expect(ratioCell('p', 0)).toBe('0.12780')
  })

  it('stays quiet while a number is half-typed', () => {
    render(<IsentropicCalculator initial={{}} onParamsChange={() => {}} />)
    fireEvent.change(valueInput('M'), { target: { value: '2.' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('starts from URL params and reports changes back', () => {
    const onParamsChange = vi.fn()
    render(<IsentropicCalculator initial={{ gamma: '1.3', kind: 'pP0', value: '0.5' }} onParamsChange={onParamsChange} />)
    expect(valueInput('p/p0').value).toBe('0.5')
    fireEvent.change(valueInput('p/p0'), { target: { value: '0.25' } })
    expect(onParamsChange).toHaveBeenLastCalledWith({ gamma: '1.3', kind: 'pP0', value: '0.25' })
  })

  it('falls back to the default kind for an unknown kind in the URL', () => {
    render(<IsentropicCalculator initial={{ kind: 'nope' }} onParamsChange={() => {}} />)
    expect(valueInput('M').value).toBe('2')
  })
})
