// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NormalShockCalculator } from '../NormalShockCalculator'

function input(name: string): HTMLInputElement {
  const el = screen.getByLabelText(name)
  if (!(el instanceof HTMLInputElement)) throw new Error(`${name} is not an input`)
  return el
}

function ratio(row: string): string {
  const table = screen.getByRole('table', { name: /across the shock/i })
  return within(within(table).getByRole('row', { name: row })).getAllByRole('cell')[0]?.textContent ?? ''
}

describe('NormalShockCalculator', () => {
  it('shows the M1 = 2 shock by default', () => {
    render(<NormalShockCalculator initial={{}} onParamsChange={() => {}} />)
    expect(ratio('p2/p1')).toBe('4.5000')
    expect(screen.getByTestId('m2-headline').textContent).toBe('0.57735')
  })

  it('updates live from the typed value', () => {
    render(<NormalShockCalculator initial={{}} onParamsChange={() => {}} />)
    fireEvent.change(input('M1'), { target: { value: '3' } })
    expect(ratio('p2/p1')).toBe('10.333')
  })

  it('solves from a downstream ratio given in the URL', () => {
    render(<NormalShockCalculator initial={{ kind: 'p2P1', value: '4.5' }} onParamsChange={() => {}} />)
    expect(screen.getByTestId('m1-headline').textContent).toBe('2.0000')
  })

  it('explains an out-of-range input next to the field', () => {
    render(<NormalShockCalculator initial={{}} onParamsChange={() => {}} />)
    fireEvent.change(input('M1'), { target: { value: '0.8' } })
    expect(screen.getByRole('alert').textContent).toMatch(/M1 must be between 1 and/)
  })

  it('draws one dumbbell row per ratio', () => {
    render(<NormalShockCalculator initial={{}} onParamsChange={() => {}} />)
    const chart = screen.getByRole('group', { name: /across the shock/i })
    expect(within(chart).getAllByRole('listitem')).toHaveLength(4)
  })
})
