import { describe, expect, it } from 'vitest'
import { isPartialNumber, nudge, parseNumber } from '../parseNumber'

describe('parseNumber', () => {
  it.each([
    ['2', 2],
    [' 1.4 ', 1.4],
    ['-3', -3],
    ['−3', -3],
    ['.5', 0.5],
    ['1,25', 1.25],
    ['2e3', 2000],
    ['1E-4', 1e-4],
    ['+7', 7],
  ])('parses %s', (text, value) => {
    expect(parseNumber(text)).toBe(value)
  })

  it.each(['', ' ', '-', '1.', '2e', '1e-', 'abc', '1.2.3', 'Infinity', 'NaN', '0x10', '1e999'])(
    'returns null for half-typed or invalid %j',
    (text) => {
      expect(parseNumber(text)).toBeNull()
    },
  )
})

describe('nudge', () => {
  it('steps by the last typed decimal place', () => {
    expect(nudge('1.4', 1, false)).toBe('1.5')
    expect(nudge('1.40', 1, false)).toBe('1.41')
    expect(nudge('2', -1, false)).toBe('1')
    expect(nudge('0.05', -1, false)).toBe('0.04')
  })

  it('steps ten times further with Shift', () => {
    expect(nudge('1.4', 1, true)).toBe('2.4')
    expect(nudge('10', -1, true)).toBe('0')
  })

  it('avoids floating-point noise', () => {
    expect(nudge('0.1', 1, false)).toBe('0.2')
    expect(nudge('0.3', -1, false)).toBe('0.2')
  })

  it('returns null when the text is not a number', () => {
    expect(nudge('abc', 1, false)).toBeNull()
    expect(nudge('1.', 1, false)).toBeNull()
  })

  it('steps exponent notation in the last digit of the mantissa', () => {
    expect(nudge('1.5e-3', 1, false)).toBe('1.6e-3')
    expect(nudge('1.5e-3', -1, true)).toBe('0.5e-3')
    expect(nudge('2e3', 1, false)).toBe('3e3')
  })
})

describe('isPartialNumber', () => {
  it.each(['', '-', '1.', '2e', '1e-', '+', '.', ' 3. '])('treats %j as unfinished', (t) => {
    expect(isPartialNumber(t)).toBe(true)
  })

  it.each(['abc', '1.2.3', '--1', '1e5e', 'Infinity', '2x'])('treats %j as not a number', (t) => {
    expect(isPartialNumber(t)).toBe(false)
  })
})
