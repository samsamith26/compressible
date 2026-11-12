import { err, ok, type Result } from '@/physics'
import { parseNumber } from './parseNumber'

/** Describes one quantity a person can enter or read. `label` uses Unicode sub/superscripts. */
export interface Quantity {
  readonly label: string
  readonly name: string
  readonly unit?: '°'
}

/** Parse a field's text into a number, with a message that names the field. */
export function parseField(text: string, name: string): Result<number> {
  const value = parseNumber(text)
  return value === null ? err('NOT_FINITE', `Enter a number for ${name}`) : ok(value)
}

/** A solve outcome that names the field the person needs to fix. */
export type FieldResult<T, F extends string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly field: F; readonly message: string }

/** Attribute a physics Result's error to a field; γ errors always belong to the γ field. */
export function attribute<T, F extends string>(
  result: Result<T>,
  field: F,
): FieldResult<T, F | 'gamma'> {
  if (result.ok) return result
  return {
    ok: false,
    field: result.error.code === 'INVALID_GAMMA' ? 'gamma' : field,
    message: result.error.message,
  }
}

export interface FieldError<F extends string> {
  readonly field: F
  readonly message: string
}

export function fieldError<T, F extends string>(result: FieldResult<T, F>): FieldError<F> | null {
  return result.ok ? null : { field: result.field, message: result.message }
}

/** The message to show on `field`, if the error belongs to it. */
export function messageFor<F extends string>(error: FieldError<F> | null, field: F): string | null {
  return error !== null && error.field === field ? error.message : null
}
