import { formatValue } from '@/lib/format'
import type { Region, ShadeProperty } from './model'

const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉']

/** Unicode subscript digits, for labels like "θ₂". */
export function sub(n: number): string {
  return String(n)
    .split('')
    .map((d) => SUB[Number(d)] ?? d)
    .join('')
}

export const SHADE_NAMES: Readonly<Record<ShadeProperty, string>> = {
  M: 'Mach number',
  p: 'static pressure p/p₁',
  T: 'temperature T/T₁',
  p0: 'total-pressure recovery p₀/p₀₁',
}

/** Every property of one region; values lead, names follow. */
export function regionRows(r: Region): readonly (readonly [string, string])[] {
  return [
    ['M', formatValue(r.mach)],
    ['β', r.betaDeg === null ? '—' : `${formatValue(r.betaDeg, 4)}°`],
    ['wall θ', `${formatValue(r.thetaCumDeg, 4)}°`],
    ['p/p₁', formatValue(r.pP1)],
    ['ρ/ρ₁', formatValue(r.rhoRho1)],
    ['T/T₁', formatValue(r.tT1)],
    ['p₀/p₀₁', formatValue(r.p0P01)],
  ]
}

/** A typed-style number for prose: 24 rather than 24.0, 34.07 rather than 34.073. */
export function plain(x: number, sig = 4): string {
  return String(Number(x.toPrecision(sig)))
}
