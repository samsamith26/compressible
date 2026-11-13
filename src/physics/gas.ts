/** Input guards shared by all solvers. */

import { err, ok, type Result } from './result'

export interface Range {
  readonly lo: number
  readonly hi: number
  readonly loInclusive: boolean
  readonly hiInclusive: boolean
}

/**
 * Mach domain every solver works in. Mach numbers outside it overflow (M² past
 * ~1e154) or underflow, so each input's valid range is the image of this domain.
 */
export const MACH_MAX = 1e6
export const MACH_MIN = 1e-12

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
  return String(Number(x.toPrecision(6)))
}

export function requireInRange(name: string, x: number, range: Range): Result<number> {
  const finite = requireFinite(name, x)
  if (!finite.ok) return finite
  const aboveLo = range.loInclusive ? x >= range.lo : x > range.lo
  const belowHi = range.hiInclusive ? x <= range.hi : x < range.hi
  return aboveLo && belowHi ? ok(x) : outOfRange(name, range)
}

/** The OUT_OF_RANGE error requireInRange would give, for checks it cannot express. */
export function outOfRange<T>(name: string, range: Range): Result<T> {
  return err('OUT_OF_RANGE', describeRange(name, range), [range.lo, range.hi])
}
