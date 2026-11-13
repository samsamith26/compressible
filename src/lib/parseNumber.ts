const NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i
/** "1,000" or "12,345,678": a thousands separator, ambiguous with a decimal comma. */
const THOUSANDS = /^[-+]?\d{1,3}(,\d{3})+$/

/**
 * Parse what a person typed into a numeric field. Accepts a Unicode minus and a decimal comma.
 * Returns null for anything that is not a complete, finite number, so half-typed text never
 * reaches a solver.
 */
export function parseNumber(text: string): number | null {
  const trimmed = text.trim().replaceAll('−', '-')
  if (THOUSANDS.test(trimmed)) return null
  const normalized = trimmed.replace(',', '.')
  if (!NUMBER.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}
