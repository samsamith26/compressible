/**
 * Parse what a person typed into a number field. Half-typed input ("-", "1.",
 * "2e") is not an error, it is unfinished, so it parses to null and the UI keeps
 * showing the last valid result instead of flashing a message.
 */

const COMPLETE_NUMBER = /^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/

function normalise(text: string): string {
  return text.trim().replace(',', '.').replace('−', '-')
}

export function parseNumber(text: string): number | null {
  const t = normalise(text)
  if (!COMPLETE_NUMBER.test(t)) return null
  const x = Number(t)
  return Number.isFinite(x) ? x : null
}

/** Text that could still become a number as the person keeps typing ("1.", "2e", "-"). */
const PARTIAL_NUMBER = /^[+-]?(\d*\.?\d*)([eE][+-]?\d*)?$/

/** True for unfinished input; false for text that can never parse ("abc", "1.2.3"). */
export function isPartialNumber(text: string): boolean {
  const t = normalise(text)
  return PARTIAL_NUMBER.test(t) && parseNumber(t) === null
}

/**
 * Step a typed number up or down by one unit in its last typed decimal place
 * ("1.4" → 0.1, "2" → 1), or ten units with `big`. Works on scaled integers so
 * 0.1 + 0.1 stays "0.2".
 */
export function nudge(text: string, dir: 1 | -1, big: boolean): string | null {
  const x = parseNumber(text)
  if (x === null) return null
  const t = normalise(text)
  const [mantissaText = '', exponentText] = t.split(/[eE]/)
  const decimals = (mantissaText.split('.')[1] ?? '').length
  const scale = 10 ** decimals
  const mantissa = exponentText === undefined ? x : Number(mantissaText)
  const next = ((Math.round(mantissa * scale) + dir * (big ? 10 : 1)) / scale).toFixed(decimals)
  // Exponent form keeps its exponent: "1.5e-3" steps to "1.6e-3", not to 1.
  return exponentText === undefined ? next : `${next}e${exponentText}`
}
