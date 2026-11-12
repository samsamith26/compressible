import { describe, expect, it } from 'vitest'
import { parseNumber } from '../parseNumber'

describe('parseNumber', () => {
  it.each([
    ['2', 2],
    [' 1.5 ', 1.5],
    ['.5', 0.5],
    ['1e-3', 1e-3],
    ['2.5E2', 250],
    ['−3', -3],
    ['-0.25', -0.25],
    ['1,5', 1.5],
  ])('parses %j', (text, expected) => {
    expect(parseNumber(text)).toBe(expected)
  })

  it.each(['', '   ', 'abc', '1.2.3', '1e', '-', 'Infinity', 'NaN', '0x10', '1 2'])('rejects %j', (text) => {
    expect(parseNumber(text)).toBeNull()
  })
})
