import { describe, expect, it } from 'vitest'
import { readUrl, writeUrl } from '../urlState'

describe('readUrl', () => {
  it('reads the calculator and its raw params', () => {
    expect(readUrl('?calc=oblique&g=1.3&m1=3&k=thetaWeak&v=20')).toEqual({
      calc: 'oblique',
      params: { gamma: '1.3', m1: '3', kind: 'thetaWeak', value: '20' },
    })
  })

  it('returns a null calculator for unknown or missing ids', () => {
    expect(readUrl('?calc=rayleigh').calc).toBeNull()
    expect(readUrl('').calc).toBeNull()
  })

  it('keeps garbage values as typed so the UI can show the error', () => {
    expect(readUrl('?g=abc&k=nope').params).toEqual({ gamma: 'abc', kind: 'nope' })
  })

  it('omits empty params', () => {
    expect(readUrl('?g=&v=2').params).toEqual({ value: '2' })
  })
})

describe('writeUrl', () => {
  it('writes params in a stable order', () => {
    expect(writeUrl('oblique', { value: '10', kind: 'thetaWeak', m1: '2', gamma: '1.4' })).toBe(
      '?calc=oblique&g=1.4&m1=2&k=thetaWeak&v=10',
    )
  })

  it('round-trips through readUrl', () => {
    const params = { gamma: '1.4', kind: 'mach', value: '2.5' }
    expect(readUrl(writeUrl('isentropic', params))).toEqual({ calc: 'isentropic', params })
  })

  it('encodes characters that need it', () => {
    expect(writeUrl('normal', { value: '1 2' })).toBe('?calc=normal&v=1+2')
  })
})
