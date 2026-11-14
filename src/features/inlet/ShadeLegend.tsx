import { formatValue } from '@/lib/format'
import type { Theme } from '@/lib/theme'
import { SHADE_NAMES } from './labels'
import type { ShadeProperty } from './model'
import { SHADE_STOPS } from './shade'

/** One-hue gradient from the lowest to the highest value across the drawn regions. */
export function ShadeLegend({
  property,
  domain,
  theme,
}: {
  readonly property: ShadeProperty
  readonly domain: readonly [number, number]
  readonly theme: Theme
}) {
  const [from, to] = SHADE_STOPS[theme]
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span>Shaded by {SHADE_NAMES[property]}</span>
      <span className="num">{formatValue(domain[0], 4)}</span>
      <span aria-hidden="true" className="h-2.5 w-28 rounded-sm" style={{ background: `linear-gradient(to right, ${from}, ${to})` }} />
      <span className="num">{formatValue(domain[1], 4)}</span>
    </div>
  )
}
