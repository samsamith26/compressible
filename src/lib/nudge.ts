/**
 * Step a value by one unit in its second significant digit (2.37 → 2.38; 0.5 → 0.51), or in the
 * first with `coarse`. Used for ArrowUp/ArrowDown in numeric fields. Zero steps by 0.1 / 1.
 */
export function nudge(value: number, direction: 1 | -1, coarse: boolean): number {
  const magnitude = value === 0 ? 0 : Math.floor(Math.log10(Math.abs(value)))
  const step = 10 ** (magnitude - (coarse ? 0 : 1))
  // Trim binary round-off (2.37 + 0.1 = 2.4700000000000002) without snapping to a grid.
  return Number((value + direction * step).toPrecision(12))
}
