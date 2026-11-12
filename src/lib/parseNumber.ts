const NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i

/**
 * Parse what a person typed into a numeric field. Accepts a Unicode minus and a decimal comma.
 * Returns null for anything that is not a complete, finite number, so half-typed text never
 * reaches a solver.
 */
export function parseNumber(text: string): number | null {
  const normalized = text.trim().replace('−', '-').replace(',', '.')
  if (!NUMBER.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}
