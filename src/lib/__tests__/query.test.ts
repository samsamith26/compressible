import { describe, expect, it } from 'vitest'
import { readEnum, readNumber, withParams } from '../query'

const params = new URLSearchParams('g=1.3&k=pP0&bad=abc&neg=-2')

describe('readNumber', () => {
  it('reads a finite number', () => {
    expect(readNumber(params, 'g', 1.4)).toBe(1.3)
  })
  it('falls back when missing or unparsable', () => {
    expect(readNumber(params, 'missing', 1.4)).toBe(1.4)
    expect(readNumber(params, 'bad', 1.4)).toBe(1.4)
  })
  it('keeps out-of-range numbers so the solver can report them', () => {
    expect(readNumber(params, 'neg', 2)).toBe(-2)
  })
})

describe('readEnum', () => {
  const kinds = ['mach', 'pP0'] as const
  it('reads an allowed value', () => {
    expect(readEnum(params, 'k', kinds, 'mach')).toBe('pP0')
  })
  it('falls back for unknown values', () => {
    expect(readEnum(params, 'bad', kinds, 'mach')).toBe('mach')
    expect(readEnum(params, 'missing', kinds, 'mach')).toBe('mach')
  })
})

describe('withParams', () => {
  it('sets and replaces keys while keeping others', () => {
    const next = withParams('?calc=iso&g=1.4', { g: '1.3', 'iso.v': '2' })
    expect(next.get('calc')).toBe('iso')
    expect(next.get('g')).toBe('1.3')
    expect(next.get('iso.v')).toBe('2')
  })
})
