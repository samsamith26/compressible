import { describe, expect, it } from 'vitest'
import { maxDeflection } from '@/physics'
import {
  OBLIQUE_KINDS,
  dragInputText,
  inputFromBeta,
  obliqueValue,
  solveObliqueText,
} from '../model'
import { parseNumber as parsedNumber } from '@/lib/parseNumber'

const base = { m1: '2', gamma: '1.4' }

describe('solveObliqueText', () => {
  it('gives the weak and strong solutions at M1 = 2, θ = 10°', () => {
    const weak = solveObliqueText({ ...base, kind: 'thetaWeak', value: '10' })
    const strong = solveObliqueText({ ...base, kind: 'thetaStrong', value: '10' })
    expect(weak.ok && weak.value.kind === 'attached' && weak.value.state.betaDeg).toBeCloseTo(39.31, 2)
    expect(strong.ok && strong.value.kind === 'attached' && strong.value.state.betaDeg).toBeCloseTo(
      83.7,
      1,
    )
  })

  it('reports detachment as a solution', () => {
    const r = solveObliqueText({ ...base, kind: 'thetaWeak', value: '25' })
    expect(r.ok && r.value.kind).toBe('detached')
  })

  it('names the field that could not be parsed', () => {
    const cases = [
      [{ ...base, gamma: '', kind: 'beta', value: '40' }, 'γ'],
      [{ ...base, m1: 'abc', kind: 'beta', value: '40' }, 'upstream Mach number'],
      [{ ...base, kind: 'm1n', value: '' }, 'normal Mach number'],
    ] as const
    for (const [input, name] of cases) {
      const r = solveObliqueText(input)
      expect(!r.ok && r.message).toBe(`Enter a number for ${name}`)
    }
  })

  it('round-trips every input kind', () => {
    const r = solveObliqueText({ ...base, kind: 'beta', value: '50' })
    if (!r.ok || r.value.kind !== 'attached') throw new Error('setup')
    // β = 50° is on the weak branch at M1 = 2, so θ inputs round-trip through thetaWeak.
    for (const kind of OBLIQUE_KINDS) {
      const value = String(obliqueValue(r.value.state, kind))
      const back = solveObliqueText({ ...base, kind: kind === 'thetaStrong' ? 'thetaWeak' : kind, value })
      expect(back.ok && back.value.kind === 'attached' && back.value.state.betaDeg).toBeCloseTo(50, 8)
    }
  })
})

describe('inputFromBeta', () => {
  const max = maxDeflection(2, 1.4)
  if (!max.ok) throw new Error('setup')
  const bMax = max.value.betaDeg

  it('keeps β and M1n inputs in their own units', () => {
    expect(inputFromBeta('beta', 2, 40, bMax, 1.4)).toEqual({ kind: 'beta', value: 40 })
    expect(inputFromBeta('m1n', 2, 30, bMax, 1.4).value).toBeCloseTo(1, 12)
  })

  it('picks the weak or strong θ branch from the side of β at θmax', () => {
    const weak = inputFromBeta('thetaStrong', 2, 39.31, bMax, 1.4)
    expect(weak.kind).toBe('thetaWeak')
    expect(weak.value).toBeCloseTo(10, 2)
    expect(inputFromBeta('thetaWeak', 2, 80, bMax, 1.4).kind).toBe('thetaStrong')
  })
})

describe('error attribution', () => {
  it('puts each error on the field that caused it', () => {
    const cases = [
      [{ m1: '2', gamma: '0.9', kind: 'beta', value: '40' }, 'gamma'],
      [{ m1: '0.8', gamma: '1.4', kind: 'beta', value: '40' }, 'm1'],
      [{ m1: '2', gamma: '1.4', kind: 'beta', value: '20' }, 'value'],
    ] as const
    for (const [input, field] of cases) {
      const r = solveObliqueText(input)
      expect(!r.ok && r.field).toBe(field)
    }
  })
})

describe('dragInputText', () => {
  it('never rounds β below the Mach angle', () => {
    // μ at M1 = 1.5 is 41.8103149°; 4 significant figures (41.81) would be below it.
    const mu = (Math.asin(1 / 1.5) * 180) / Math.PI
    const text = dragInputText({ kind: 'beta', value: mu }, '1.5', '1.4', mu)
    expect(Number(text)).toBeGreaterThanOrEqual(mu * (1 - 1e-12))
    expect(solveObliqueText({ m1: '1.5', gamma: '1.4', kind: 'beta', value: text }).ok).toBe(true)
  })
  it('never rounds θ past θmax into detachment', () => {
    const max = maxDeflection(3, 1.4)
    if (!max.ok) throw new Error('setup')
    const next = inputFromBeta('thetaWeak', 3, max.value.betaDeg, max.value.betaDeg, 1.4)
    const text = dragInputText(next, '3', '1.4', max.value.betaDeg)
    const r = solveObliqueText({ m1: '3', gamma: '1.4', kind: next.kind, value: text })
    expect(r.ok && r.value.kind).toBe('attached')
  })
  it('keeps short text where it is accurate enough', () => {
    expect(dragInputText({ kind: 'beta', value: 45.123456 }, '2', '1.4', 45.123456)).toBe('45.12')
  })
})

describe('parsedSnapshot', () => {
  it('reads M1 and θ with the same parser as the solver', () => {
    expect(parsedNumber('25,5')).toBe(25.5)
    expect(parsedNumber('abc')).toBeNull()
  })
})
