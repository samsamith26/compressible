/**
 * Display formatting for results: a fixed number of significant figures, with
 * scientific notation (real superscripts, real minus sign) outside 1e-4 … 1e6.
 */

const MINUS = '−'
const SUPERSCRIPT: Readonly<Record<string, string>> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
}

function superscript(n: number): string {
  return [...String(n)].map((c) => SUPERSCRIPT[c] ?? c).join('')
}

export function formatValue(x: number, sig = 5): string {
  if (!Number.isFinite(x)) return '—'
  if (x === 0) return '0'
  const sign = x < 0 ? MINUS : ''
  const ax = Math.abs(x)
  if (ax >= 1e-4 && ax < 1e6) {
    const decimals = Math.max(0, sig - 1 - Math.floor(Math.log10(ax)))
    return sign + ax.toFixed(decimals)
  }
  const [mantissa = '', exponent = '0'] = ax.toExponential(sig - 1).split('e')
  return `${sign}${mantissa}×10${superscript(Number(exponent))}`
}
