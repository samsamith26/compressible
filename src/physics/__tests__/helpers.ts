import { expect } from 'vitest'
import type { ErrorCode, Result } from '../result'

/** Unwrap an ok Result or fail the test with the error message. */
export function unwrap<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.error.code}: ${r.error.message}`)
  return r.value
}

/** Assert |actual - expected| <= rel * |expected| (absolute when expected is 0). */
export function expectRel(actual: number, expected: number, rel = 1e-5): void {
  const tol = expected === 0 ? rel : rel * Math.abs(expected)
  expect(Math.abs(actual - expected), `${actual} vs ${expected}`).toBeLessThanOrEqual(tol)
}

export function expectError<T>(r: Result<T>, code: ErrorCode): void {
  expect(r.ok ? 'ok' : r.error.code).toBe(code)
}

export function expectBounds<T>(r: Result<T>, bounds: readonly [number, number], rel = 1e-5): void {
  if (r.ok) throw new Error('expected an error with bounds, got ok')
  const b = r.error.bounds
  if (b === undefined) throw new Error('error has no bounds')
  expectRel(b[0], bounds[0], rel)
  if (bounds[1] === Infinity) expect(b[1]).toBe(Infinity)
  else expectRel(b[1], bounds[1], rel)
}
