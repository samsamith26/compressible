/**
 * Region shading: one sequential hue, low → high value. The stops were validated with the dataviz
 * palette script (monotone lightness, single hue, light end ≥ 2:1 against the panel) in both themes.
 * In light mode higher values are darker; in dark mode they are lighter (more contrast on graphite).
 */

import { contrastRatio } from '@/lib/contrast'
import type { Theme } from '@/lib/theme'
import type { Region, ShadeProperty } from './model'

export const SHADE_STOPS: Readonly<Record<Theme, readonly [string, string]>> = {
  light: ['#8fb0e0', '#1b4383'],
  dark: ['#2b5089', '#98b9f1'],
}

/** Ink and paper tokens per theme (src/index.css), for picking a legible label colour. */
const INK: Readonly<Record<Theme, { readonly ink: string; readonly paper: string }>> = {
  light: { ink: '#17191d', paper: '#f5f3ee' },
  dark: { ink: '#e7e5df', paper: '#0e1013' },
}

export function shadeValue(region: Region, property: ShadeProperty): number {
  switch (property) {
    case 'M':
      return region.mach
    case 'p':
      return region.pP1
    case 'T':
      return region.tT1
    case 'p0':
      return region.p0P01
  }
}

function channels(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Linear mix of two #rrggbb colours. */
export function mix(a: string, b: string, t: number): string {
  const ca = channels(a)
  const cb = channels(b)
  return `#${ca
    .map((c, i) => Math.round(c + ((cb[i] ?? c) - c) * t))
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`
}

/** Fill for a value within [lo, hi]; the middle colour when the range is empty. */
export function shadeColor(value: number, [lo, hi]: readonly [number, number], theme: Theme): string {
  const [from, to] = SHADE_STOPS[theme]
  const t = hi - lo > 1e-12 ? Math.min(1, Math.max(0, (value - lo) / (hi - lo))) : 0.5
  return mix(from, to, t)
}

/** One domain across the multi-ramp regions and, when shown, the comparison's regions. */
export function shadeDomain(values: readonly number[], others: readonly number[]): [number, number] {
  const all = [...values, ...others]
  return [Math.min(...all), Math.max(...all)]
}

/** Whichever of ink or paper contrasts more with the fill. */
export function labelInk(fill: string, theme: Theme): 'var(--ink)' | 'var(--paper)' {
  const { ink, paper } = INK[theme]
  return contrastRatio(fill, ink) >= contrastRatio(fill, paper) ? 'var(--ink)' : 'var(--paper)'
}
