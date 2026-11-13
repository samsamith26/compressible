import { describe, expect, it } from 'vitest'
import { formatValue, shortestText, toQueryNumber } from '../format'

describe('formatValue', () => {
  it.each([
    [2, '2.0000'],
    [0.12780452, '0.12780'],
    [1.6875, '1.6875'],
    [26.379760813, '26.380'],
    [4.5, '4.5000'],
    [1234.5678, '1234.6'],
    [0, '0'],
    [-0.5, '−0.50000'],
  ])('formats %d to 5 significant figures', (x, expected) => {
    expect(formatValue(x)).toBe(expected)
  })

  it('uses scientific notation for very large and very small magnitudes', () => {
    expect(formatValue(1.23456e-7)).toBe('1.2346×10⁻⁷')
    expect(formatValue(5e12)).toBe('5.0000×10¹²')
    expect(formatValue(123456)).toBe('1.2346×10⁵')
  })

  it('honours a custom number of significant figures', () => {
    expect(formatValue(Math.PI, 3)).toBe('3.14')
  })

  it('shows a dash for missing or non-finite values', () => {
    expect(formatValue(null)).toBe('—')
    expect(formatValue(Number.NaN)).toBe('—')
    expect(formatValue(Number.POSITIVE_INFINITY)).toBe('—')
  })
})

describe('toQueryNumber', () => {
  it('rounds to 10 significant figures and trims trailing zeros', () => {
    expect(toQueryNumber(2)).toBe('2')
    expect(toQueryNumber(0.1 + 0.2)).toBe('0.3')
    expect(toQueryNumber(39.31393184312)).toBe('39.31393184')
    expect(toQueryNumber(1e-7)).toBe('1e-7')
    expect(toQueryNumber(2.13719, 4)).toBe('2.137')
  })
})

describe('formatValue rounding edge', () => {
  it('switches to ×10ⁿ when rounding carries into the next decade', () => {
    expect(formatValue(99999.7)).toBe('1.0000×10⁵')
    expect(formatValue(0.000099999)).toBe('9.9999×10⁻⁵')
    expect(formatValue(0.000099999999)).toBe('0.00010000')
  })
})

describe('shortestText', () => {
  it('returns the shortest rounding the check accepts', () => {
    expect(shortestText(41.810314896, () => true)).toBe('41.81')
    expect(shortestText(41.810314896, (x) => x >= 41.8103)).toBe('41.8103')
  })
  it('falls back to full precision when no rounding is accepted', () => {
    expect(shortestText(1 / 3, () => false)).toBe(String(1 / 3))
  })
})
