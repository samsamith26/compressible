import { describe, expect, it } from 'vitest'
import { addRampTexts, clampSelection, parseList, removeRampTexts, solveInletText } from '../model'

const DEFAULT_TEXT = { gamma: '1.4', m1: '3', thetas: ['8', '8', '8'], lengths: ['1', '0.6', '0.4'] }

describe('parseList (Review Focus 1)', () => {
  const fallback = ['8', '8', '8']
  it('splits on commas, keeping entries as typed', () => {
    expect(parseList('8,10,12', fallback)).toEqual(['8', '10', '12'])
    expect(parseList('8,,x', fallback)).toEqual(['8', '', 'x'])
  })

  it('falls back when the list is missing or has the wrong number of entries', () => {
    expect(parseList(null, fallback)).toEqual(fallback)
    expect(parseList('1,2,3,4,5', fallback)).toEqual(fallback)
    // An empty value is one ramp whose field was cleared, not a missing list.
    expect(parseList('', fallback)).toEqual([''])
  })
})

describe('solveInletText', () => {
  it('solves the default text', () => {
    const r = solveInletText(DEFAULT_TEXT)
    expect(r.ok && r.value.chain.regions[3]!.p0P01).toBeCloseTo(0.95595, 5)
    expect(r.ok && r.value.single.kind).toBe('attached')
    expect(r.ok && r.value.m1).toBe(3)
  })

  it('names the ramp field that needs fixing', () => {
    const theta = solveInletText({ ...DEFAULT_TEXT, thetas: ['8', 'x', '8'] })
    expect(!theta.ok && theta.field).toBe('theta2')
    const length = solveInletText({ ...DEFAULT_TEXT, lengths: ['1', '0', '0.4'] })
    expect(!length.ok && length).toMatchObject({ field: 'length2', message: 'Ramp 2 length must be greater than 0' })
    const negative = solveInletText({ ...DEFAULT_TEXT, thetas: ['8', '8', '-1'] })
    expect(!negative.ok && negative.field).toBe('theta3')
    expect(!negative.ok && negative.message).toMatch(/^Ramp 3: /)
  })

  it('puts M1 and γ errors on their own fields', () => {
    expect(solveInletText({ ...DEFAULT_TEXT, m1: '0.5' })).toMatchObject({ ok: false, field: 'm1' })
    expect(solveInletText({ ...DEFAULT_TEXT, m1: 'abc' })).toMatchObject({ ok: false, field: 'm1' })
    expect(solveInletText({ ...DEFAULT_TEXT, gamma: '1' })).toMatchObject({ ok: false, field: 'gamma' })
  })

  it('treats a mismatched lengths list as a length error, not a crash', () => {
    const r = solveInletText({ ...DEFAULT_TEXT, lengths: ['1', '0.6'] })
    expect(!r.ok && r.field).toBe('length3')
  })
})

describe('adding and removing ramps', () => {
  it('appends 8° at 0.7× the previous length, up to four ramps', () => {
    const four = addRampTexts(['8', '8', '8'], ['1', '0.6', '0.4'])
    expect(four).toEqual({ thetas: ['8', '8', '8', '8'], lengths: ['1', '0.6', '0.4', '0.28'] })
    expect(addRampTexts(four.thetas, four.lengths)).toEqual(four)
  })

  it('falls back to length 1 when the previous length is not a number', () => {
    expect(addRampTexts(['8'], ['x']).lengths).toEqual(['x', '1'])
  })

  it('removes a ramp but never the last one', () => {
    expect(removeRampTexts(['8', '9', '10'], ['1', '0.6', '0.4'], 1)).toEqual({ thetas: ['8', '10'], lengths: ['1', '0.4'] })
    expect(removeRampTexts(['8'], ['1'], 0)).toEqual({ thetas: ['8'], lengths: ['1'] })
  })
})

describe('clampSelection (Review Focus 2)', () => {
  it('keeps the selected shock within the shocks that exist', () => {
    expect(clampSelection(4, 2)).toBe(2)
    expect(clampSelection(0, 3)).toBe(1)
    expect(clampSelection(Number.NaN, 3)).toBe(1)
    expect(clampSelection(2, 3)).toBe(2)
  })
})
