/** Typed inputs for the reflecting-shock mode → a validated solve, with errors on the field at fault. */

import { maxDeflection } from '@/physics'
import { attribute, parseField, type FieldResult } from '@/lib/fields'
import { solveReflect, type ReflectSolution } from './model'

export type ReflectField = 'gamma' | 'm1' | 'theta' | 'height' | 'length'

export interface ReflectText {
  readonly gamma: string
  readonly m1: string
  readonly theta: string
  readonly height: string
  readonly length: string
}

export interface ReflectState {
  /** The γ this solution was solved with (it can differ from the γ field while that is mid-edit). */
  readonly gamma: number
  readonly solution: ReflectSolution
}

export const REFLECT_DEFAULTS: ReflectText = { gamma: '1.4', m1: '3', theta: '10', height: '1', length: '5' }

const RANGES: readonly (readonly [Exclude<ReflectField, 'gamma' | 'm1'>, string, number, string])[] = [
  ['theta', 'ramp angle', 40, 'θ must be greater than 0 and at most 40°'],
  ['height', 'cowl height', 5, 'H must be greater than 0 and at most 5'],
  ['length', 'channel length', 20, 'L must be greater than 0 and at most 20'],
]

export function solveReflectText(t: ReflectText): FieldResult<ReflectState, ReflectField> {
  const gamma = parseField(t.gamma, 'γ')
  if (!gamma.ok) return attribute(gamma, 'gamma')
  const m1 = parseField(t.m1, 'upstream Mach number')
  if (!m1.ok) return attribute(m1, 'm1')
  // Check the upstream state first, so an M₁ problem is reported on the M₁ field.
  const upstream = maxDeflection(m1.value, gamma.value)
  if (!upstream.ok) return attribute(upstream, 'm1')

  const values: Partial<Record<'theta' | 'height' | 'length', number>> = {}
  for (const [field, name, max, message] of RANGES) {
    const v = parseField(t[field], name)
    if (!v.ok) return attribute(v, field)
    if (!(v.value > 0 && v.value <= max)) return { ok: false, field, message }
    values[field] = v.value
  }
  const input = { m1: m1.value, thetaDeg: values.theta ?? 0, height: values.height ?? 0, length: values.length ?? 0 }
  const solution = solveReflect(input, gamma.value)
  if (!solution.ok) return attribute(solution, 'm1')
  return { ok: true, value: { gamma: gamma.value, solution: solution.value } }
}
