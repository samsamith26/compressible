import { powerOfTen } from './format'

/** Decade ticks (…, 0.01, 0.1, 1, 10, …) covering [lo, hi] for log axes. */
export function decadeTicks(lo: number, hi: number): { value: number; label: string }[] {
  const ticks: { value: number; label: string }[] = []
  for (let e = Math.ceil(Math.log10(lo)); e <= Math.floor(Math.log10(hi)); e++) {
    const value = 10 ** e
    ticks.push({ value, label: e >= -3 && e <= 3 ? String(value) : `1×${powerOfTen(e)}` })
  }
  return ticks
}
