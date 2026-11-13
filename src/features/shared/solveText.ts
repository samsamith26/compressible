/**
 * Turning typed text into a physics call. Each calculator's model uses these so
 * every one treats half-typed input, garbage input and physics errors the same way.
 */

import { isPartialNumber, parseNumber } from '@/lib/parseNumber'
import { err, type Result } from '@/physics'

/** A solve attempt from text. A null result means some input is still being typed. */
export interface TextSolve<T, F extends string> {
  readonly result: Result<T> | null
  /** Which input an error belongs to, so it can be shown next to that field. */
  readonly field: F | null
}

export type ParsedText = { readonly ok: true; readonly value: number } | { readonly ok: false; readonly partial: boolean }

export function readNumber(text: string): ParsedText {
  const v = parseNumber(text)
  if (v !== null) return { ok: true, value: v }
  return { ok: false, partial: isPartialNumber(text) }
}

export function notANumber<T, F extends string>(field: F, name: string): TextSolve<T, F> {
  return { result: err('NOT_FINITE', `${name} must be a number`), field }
}

export const PENDING = { result: null, field: null } as const

/** Seed text for a value: 6 significant figures, trailing zeros trimmed. */
export function seedText(x: number, sig = 6): string {
  return String(Number(x.toPrecision(sig)))
}
