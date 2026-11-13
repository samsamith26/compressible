import { describe, expect, it } from 'vitest'
import { formatValue } from '../format'

describe('formatValue', () => {
  it.each([
    [0.12780452, '0.12780'],
    [4.5, '4.5000'],
    [2, '2.0000'],
    [26.379761, '26.380'],
    [123456, '123456'],
    [0.00012345, '0.00012345'],
    [0, '0'],
  ])('fixed notation: %d → %s', (x, s) => {
    expect(formatValue(x)).toBe(s)
  })

  it.each([
    [1.2e30, '1.2000×10³⁰'],
    [-3e-7, '−3.0000×10⁻⁷'],
    [1e6, '1.0000×10⁶'],
    [4.4e-5, '4.4000×10⁻⁵'],
  ])('scientific notation with superscripts: %d → %s', (x, s) => {
    expect(formatValue(x)).toBe(s)
  })

  it('uses a real minus sign for negative fixed values', () => {
    expect(formatValue(-1.5)).toBe('−1.5000')
  })

  it('honours the significant-figure argument', () => {
    expect(formatValue(Math.PI, 3)).toBe('3.14')
  })

  it('renders non-finite values as a dash', () => {
    expect(formatValue(Number.NaN)).toBe('—')
    expect(formatValue(Infinity)).toBe('—')
  })
})
