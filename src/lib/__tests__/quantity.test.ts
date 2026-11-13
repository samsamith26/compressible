import { describe, expect, it } from 'vitest'
import { parseSubscripts, plainLabel } from '../quantity'

describe('parseSubscripts', () => {
  it('splits a label into text and subscript runs', () => {
    expect(parseSubscripts('p_2/p_1')).toEqual([
      { text: 'p', sub: false },
      { text: '2', sub: true },
      { text: '/p', sub: false },
      { text: '1', sub: true },
    ])
  })

  it('takes a braced multi-character subscript', () => {
    expect(parseSubscripts('M_{1n}')).toEqual([
      { text: 'M', sub: false },
      { text: '1n', sub: true },
    ])
  })

  it('leaves labels without subscripts alone', () => {
    expect(parseSubscripts('A/A*')).toEqual([{ text: 'A/A*', sub: false }])
  })
})

describe('plainLabel', () => {
  it('flattens to readable text for aria labels', () => {
    expect(plainLabel('p_02/p_01')).toBe('p02/p01')
    expect(plainLabel('M_{1n}')).toBe('M1n')
  })
})
