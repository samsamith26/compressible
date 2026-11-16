import { describe, expect, it } from 'vitest'
import { solveReflectText } from '../text'

const OK = { gamma: '1.4', m1: '3', theta: '10', height: '1', length: '5' }

describe('solveReflectText', () => {
  it('solves the default inputs', () => {
    const r = solveReflectText(OK)
    expect(r.ok && r.value.solution.shocks).toHaveLength(4)
    expect(r.ok && r.value.gamma).toBe(1.4)
  })

  it.each([
    [{ theta: '0' }, 'theta', 'θ must be greater than 0 and at most 40°'],
    [{ theta: '41' }, 'theta', 'θ must be greater than 0 and at most 40°'],
    [{ height: '0' }, 'height', 'H must be greater than 0 and at most 5'],
    [{ height: '6' }, 'height', 'H must be greater than 0 and at most 5'],
    [{ length: '-1' }, 'length', 'L must be greater than 0 and at most 20'],
    [{ length: '21' }, 'length', 'L must be greater than 0 and at most 20'],
  ])('rejects %j on its own field', (patch, field, message) => {
    expect(solveReflectText({ ...OK, ...patch })).toEqual({ ok: false, field, message })
  })

  it('names fields that are not numbers', () => {
    expect(solveReflectText({ ...OK, theta: 'x' })).toMatchObject({ ok: false, field: 'theta' })
    expect(solveReflectText({ ...OK, m1: 'x' })).toMatchObject({ ok: false, field: 'm1' })
    expect(solveReflectText({ ...OK, gamma: '1' })).toMatchObject({ ok: false, field: 'gamma' })
    expect(solveReflectText({ ...OK, m1: '0.9' })).toMatchObject({ ok: false, field: 'm1' })
  })
})
