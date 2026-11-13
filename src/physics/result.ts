/**
 * Error-as-value result type used by every physics solver. Solvers never throw,
 * so live UI inputs can show a validation message instead of crashing.
 */

export type ErrorCode =
  | 'INVALID_GAMMA'
  | 'OUT_OF_RANGE'
  | 'NOT_FINITE'
  | 'NO_BRACKET'
  | 'NO_CONVERGENCE'

export interface PhysicsError {
  readonly code: ErrorCode
  readonly message: string
  /** Valid interval for the offending input, when one exists. */
  readonly bounds?: readonly [number, number]
}

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: PhysicsError }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err<T>(
  code: ErrorCode,
  message: string,
  bounds?: readonly [number, number],
): Result<T> {
  return bounds === undefined
    ? { ok: false, error: { code, message } }
    : { ok: false, error: { code, message, bounds } }
}
