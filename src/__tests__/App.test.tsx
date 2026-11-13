// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../App'

function at(search: string) {
  window.history.replaceState(null, '', `/${search}`)
}

function input(name: string): HTMLInputElement {
  const el = screen.getByLabelText(name)
  if (!(el instanceof HTMLInputElement)) throw new Error(`${name} is not an input`)
  return el
}

beforeEach(() => at(''))

describe('App', () => {
  it('opens the calculator and inputs named in the URL', () => {
    at('?calc=oblique&g=1.4&m1=3&k=thetaWeak&v=20')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Oblique shock')
    expect(input('M1').value).toBe('3')
    expect(input('θ').value).toBe('20')
  })

  it('mirrors typed input into the URL', () => {
    render(<App />)
    fireEvent.change(input('M'), { target: { value: '2.5' } })
    expect(window.location.search).toBe('?calc=isentropic&g=1.4&k=mach&v=2.5')
  })

  it('updates the URL when switching calculators and keeps each calculator’s inputs', () => {
    render(<App />)
    fireEvent.change(input('M'), { target: { value: '3' } })
    fireEvent.mouseDown(screen.getByRole('tab', { name: /normal/i }))
    expect(new URLSearchParams(window.location.search).get('calc')).toBe('normal')
    fireEvent.mouseDown(screen.getByRole('tab', { name: /isentropic/i }))
    expect(input('M').value).toBe('3')
  })

  it('survives garbage in the URL: defaults plus a γ message', () => {
    at('?calc=nope&g=abc&k=nope')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Isentropic flow')
    expect(screen.getByRole('alert').textContent).toBe('γ must be a number')
    expect(input('M').value).toBe('2')
  })
})
