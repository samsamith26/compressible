/**
 * Calculator state in the URL query string, so a result can be shared or
 * bookmarked. Values are kept exactly as typed: each calculator validates its
 * own params and falls back to its defaults.
 */

import { isCalcId, type CalcId } from './calculators'

export interface CalcParams {
  gamma?: string
  m1?: string
  kind?: string
  value?: string
}

const KEYS: ReadonlyArray<readonly [keyof CalcParams, string]> = [
  ['gamma', 'g'],
  ['m1', 'm1'],
  ['kind', 'k'],
  ['value', 'v'],
]

export function readUrl(search: string): { calc: CalcId | null; params: CalcParams } {
  const q = new URLSearchParams(search)
  const calc = q.get('calc')
  const params: CalcParams = {}
  for (const [field, key] of KEYS) {
    const v = q.get(key)
    if (v !== null && v !== '') params[field] = v
  }
  return { calc: isCalcId(calc) ? calc : null, params }
}

export function writeUrl(calc: CalcId, params: CalcParams): string {
  const q = new URLSearchParams({ calc })
  for (const [field, key] of KEYS) {
    const v = params[field]
    if (v !== undefined) q.set(key, v)
  }
  return `?${q.toString()}`
}
