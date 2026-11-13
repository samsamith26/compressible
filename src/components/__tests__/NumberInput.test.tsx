// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { NumberInput } from '../NumberInput'

function Harness({ initial, error }: { initial: string; error?: string }) {
  const [text, setText] = useState(initial)
  return <NumberInput id="m" label="M_1" text={text} onTextChange={setText} {...(error ? { error } : {})} />
}

describe('NumberInput', () => {
  it('is labelled, including subscripts, and keeps the typed text', () => {
    render(<Harness initial="2" />)
    const input = screen.getByLabelText('M1')
    fireEvent.change(input, { target: { value: '2.' } })
    expect(screen.getByLabelText<HTMLInputElement>('M1').value).toBe('2.')
  })

  it('steps with the arrow keys, ten times further with Shift', () => {
    render(<Harness initial="1.4" />)
    const input = screen.getByLabelText<HTMLInputElement>('M1')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.value).toBe('1.5')
    fireEvent.keyDown(input, { key: 'ArrowDown', shiftKey: true })
    expect(input.value).toBe('0.5')
  })

  it('shows the error and links it to the input', () => {
    render(<Harness initial="0.5" error="M1 must be greater than 1" />)
    const input = screen.getByLabelText('M1')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const id = input.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(id)?.textContent).toContain('M1 must be greater than 1')
  })
})
