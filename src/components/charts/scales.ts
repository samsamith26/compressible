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
