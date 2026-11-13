/**
 * Nudge label positions apart so none are closer than `gap`, keeping their order and staying as
 * close as possible to the targets. Returns positions in the input order.
 */
export function spreadLabels(targets: readonly number[], gap: number): number[] {
  const order = targets.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y)
  const placed = order.map((o) => o.y)
  for (let k = 1; k < placed.length; k++) {
    placed[k] = Math.max(placed[k] ?? 0, (placed[k - 1] ?? 0) + gap)
  }
  // Re-centre each cluster on its targets so labels do not all drift downwards.
  const shift = (placed.reduce((s, y) => s + y, 0) - order.reduce((s, o) => s + o.y, 0)) / Math.max(1, placed.length)
  const out = new Array<number>(targets.length).fill(0)
  order.forEach((o, k) => {
    out[o.i] = (placed[k] ?? 0) - shift
  })
  return out
}
