import { parseNumber } from './parseNumber'

/** Read a finite number from the query string, or `fallback` when missing or unparsable. */
export function readNumber(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key)
  if (raw === null) return fallback
  return parseNumber(raw) ?? fallback
}

/** Read one of `allowed` from the query string, or `fallback`. */
export function readEnum<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = params.get(key)
  return allowed.find((v) => v === raw) ?? fallback
}

/** Return a copy of `search` with `updates` applied. */
export function withParams(search: string, updates: Readonly<Record<string, string>>): URLSearchParams {
  const next = new URLSearchParams(search)
  for (const [key, value] of Object.entries(updates)) next.set(key, value)
  return next
}
