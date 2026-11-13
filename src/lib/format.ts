const SUPERSCRIPT: Readonly<Record<string, string>> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
}

function superscript(digits: string): string {
  return [...digits].map((c) => SUPERSCRIPT[c] ?? c).join('')
}

/** "10⁻⁵" for e = -5. */
export function powerOfTen(e: number): string {
  return `10${superscript(String(e))}`
}

/**
 * Format a result for display: `sig` significant figures, scientific notation (×10ⁿ) outside
 * [1e-4, 1e5), a typographic minus, and a dash for missing values.
 */
export function formatValue(x: number | null, sig = 5): string {
  if (x === null || !Number.isFinite(x)) return '—'
  if (x === 0) return '0'
  const sign = x < 0 ? '−' : ''
  // Take the exponent after rounding, so 99999.7 → 1.0000×10⁵ (toPrecision would give "1.0000e+5").
  const abs = Number(Math.abs(x).toPrecision(sig))
  const exponent = Math.floor(Math.log10(abs))
  if (exponent >= 5 || exponent < -4) {
    const [mantissa = '', exp = ''] = abs.toExponential(sig - 1).split('e')
    return `${sign}${mantissa}×10${superscript(String(Number(exp)))}`
  }
  return sign + abs.toPrecision(sig)
}

/**
 * The shortest text (4 to 12 significant figures) for `value` that `accept` approves, e.g. one
 * that still solves to an in-range state. Falls back to full precision.
 */
export function shortestText(value: number, accept: (rounded: number) => boolean): string {
  for (let sig = 4; sig <= 12; sig++) {
    const text = toQueryNumber(value, sig)
    if (accept(Number(text))) return text
  }
  return String(value)
}

/** Compact, stable text for a number in a URL or input: `sig` significant figures, no trailing zeros. */
export function toQueryNumber(x: number, sig = 10): string {
  return String(Number(x.toPrecision(sig)))
}
