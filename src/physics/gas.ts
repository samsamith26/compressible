/** Input guards shared by all solvers. */

import { err, ok, type Result } from './result'

export interface Range {
  readonly lo: number
  readonly hi: number
  readonly loInclusive: boolean
  readonly hiInclusive: boolean
}

export function requireFinite(name: string, x: number): Result<number> {
  return Number.isFinite(x) ? ok(x) : err('NOT_FINITE', `${name} must be a finite number`)
}

/** Ratio of specific heats; every relation here requires γ > 1. */
export function validateGamma(gamma: number): Result<number> {
  const finite = requireFinite('γ', gamma)
  if (!finite.ok) return finite
  return gamma > 1 ? ok(gamma) : err('INVALID_GAMMA', 'γ must be greater than 1', [1, Infinity])
}

function describeRange(name: string, range: Range): string {
  if (range.hi === Infinity) {
    return range.loInclusive
      ? `${name} must be at least ${range.lo}`
      : `${name} must be greater than ${range.lo}`
  }
  return `${name} must be between ${fmt(range.lo)} and ${fmt(range.hi)}`
}

function fmt(x: number): string {
  return Number.isInteger(x) ? String(x) : x.toPrecision(6)
}

export function requireInRange(name: string, x: number, range: Range): Result<number> {
  const finite = requireFinite(name, x)
  if (!finite.ok) return finite
  const aboveLo = range.loInclusive ? x >= range.lo : x > range.lo
  const belowHi = range.hiInclusive ? x <= range.hi : x < range.hi
  return aboveLo && belowHi
    ? ok(x)
    : err('OUT_OF_RANGE', describeRange(name, range), [range.lo, range.hi])
}
