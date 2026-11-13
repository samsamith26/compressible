/** Clamp v into the range (either order). NaN maps to the low end. */
export function clampToRange(v: number, range: readonly [number, number]): number {
  const lo = Math.min(range[0], range[1])
  const hi = Math.max(range[0], range[1])
  if (Number.isNaN(v)) return lo
  return Math.min(hi, Math.max(lo, v))
}

/** Powers of ten within [lo, hi], thinned to at most 7 ticks. */
export function niceLogTicks(lo: number, hi: number): number[] {
  const first = Math.ceil(Math.log10(lo) - 1e-9)
  const last = Math.floor(Math.log10(hi) + 1e-9)
  const decades = last - first + 1
  const step = Math.max(1, Math.ceil(decades / 7))
  const ticks: number[] = []
  // Anchor the stride on 10⁰ so 1 is always a tick when it is in range.
  for (let e = first; e <= last; e++) {
    if (((e % step) + step) % step === 0) ticks.push(Number(`1e${e}`))
  }
  return ticks
}

const SUP: Readonly<Record<string, string>> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
}

/** Short axis tick label: plain for 1e-4 ≤ |v| < 1e5, "10ⁿ" for powers of ten outside that. */
export function formatTick(v: number): string {
  if (v === 0) return '0'
  const a = Math.abs(v)
  if (a >= 1e-4 && a < 1e5) return String(Number(v.toPrecision(3)))
  const e = Math.round(Math.log10(a))
  return `10${[...String(e)].map((c) => SUP[c] ?? c).join('')}`
}

/**
 * Series whose direct labels would not collide (at least `gap` px apart), kept in
 * series order; the legend carries any label that is dropped.
 */
export function separatedLabels<S>(series: readonly S[], yOf: (s: S) => number, gap: number): S[] {
  const kept: S[] = []
  for (const s of series) {
    if (kept.every((k) => Math.abs(yOf(k) - yOf(s)) >= gap)) kept.push(s)
  }
  return kept
}
