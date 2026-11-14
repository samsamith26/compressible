import { scaleLinear } from 'd3-scale'
import { useState } from 'react'
import { AxisBottom, AxisLeft } from '@/components/charts/Axis'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cn } from '@/lib/cn'
import { formatValue } from '@/lib/format'
import { plain } from './labels'
import type { RecoveryStep } from './recovery'

const MARGIN = { top: 26, right: 132, bottom: 42, left: 52 }
const HEIGHT = 230

interface RecoveryChartProps {
  readonly steps: readonly RecoveryStep[]
  /** The single-shock comparison, when shown and attached. */
  readonly single: readonly RecoveryStep[] | null
  readonly rampCount: number
  /** Shocks actually solved; fewer than `rampCount` when the chain stopped early. */
  readonly completed: number
  readonly totalTurnDeg: number
  readonly stale: boolean
}

/** Draw a step line: flat across each station, dropping at the next shock. */
function stepPath(steps: readonly RecoveryStep[], x: (s: number) => number, y: (v: number) => number, end: number): string {
  let d = ''
  steps.forEach((s, i) => {
    const next = steps[i + 1]
    const x0 = x(s.station)
    const x1 = x(next === undefined ? end : next.station)
    d += `${i === 0 ? 'M' : 'L'}${x0},${y(s.p0P01)}H${x1}`
    if (next !== undefined) d += `V${y(next.p0P01)}`
  })
  return d
}

/**
 * Cumulative total-pressure recovery p₀/p₀₁ as a step line that drops at each shock, with the
 * single-shock case as a second series. Direct labels name both final values; each station is a
 * focusable point with its value.
 */
export function RecoveryChart({ steps, single, rampCount, completed, totalTurnDeg, stale }: RecoveryChartProps) {
  const chainName = completed < rampCount ? `${completed} of ${rampCount} ramps` : `${rampCount} ramp${rampCount === 1 ? '' : 's'}`
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const w = Math.max(width, 300)
  const innerW = w - MARGIN.left - MARGIN.right
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom
  const lastStation = Math.max(steps.at(-1)?.station ?? 1, single === null ? 0 : 1, 1)
  const end = lastStation + 0.5
  const low = Math.min(...steps.map((s) => s.p0P01), ...(single ?? []).map((s) => s.p0P01))
  const yMin = Math.max(0, Math.floor((low - 0.05) * 20) / 20)
  const x = scaleLinear().domain([0, end]).range([0, innerW])
  const y = scaleLinear().domain([yMin, 1]).range([innerH, 0])
  const xTicks = Array.from({ length: lastStation + 1 }, (_, i) => ({ value: i, label: i === 0 ? 'free' : `${i}` }))
  const yTicks = y.ticks(5).map((v) => ({ value: v, label: formatValue(v, 2) }))
  const finalMulti = steps.at(-1)
  const finalSingle = single?.at(-1)
  const shown = active === null ? undefined : steps.find((s) => s.station === active)

  return (
    <div ref={ref} className={cn('relative transition-opacity', stale && 'opacity-45')}>
      <svg role="group" aria-label="Total-pressure recovery after each shock" width={w} height={HEIGHT} className="block max-w-full">
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          <g transform={`translate(0,${innerH})`}>
            <AxisBottom ticks={xTicks} scale={x} gridLength={innerH} title="after shock" />
          </g>
          <AxisLeft ticks={yTicks} scale={y} gridLength={innerW} title="p₀/p₀₁" />
          {single === null ? null : (
            <path d={stepPath(single, x, y, end)} fill="none" stroke="var(--down)" strokeWidth={2} strokeDasharray="5 3" aria-hidden="true" />
          )}
          <path d={stepPath(steps, x, y, end)} fill="none" stroke="var(--up)" strokeWidth={2.5} aria-hidden="true" />
          {finalMulti === undefined ? null : (
            <text x={x(end) + 6} y={y(finalMulti.p0P01)} dy="0.32em" className="num fill-ink text-[11px]">
              {chainName} {formatValue(finalMulti.p0P01, 3)}
            </text>
          )}
          {finalSingle === undefined ? null : (
            <text x={x(end) + 6} y={y(finalSingle.p0P01)} dy="0.32em" className="num fill-ink text-[11px]">
              single {plain(totalTurnDeg)}° {formatValue(finalSingle.p0P01, 3)}
            </text>
          )}
          {steps.map((s) => (
            <g
              key={s.station}
              role="img"
              tabIndex={0}
              aria-label={`${s.station === 0 ? 'Freestream' : `After shock ${s.station}`}: p₀/p₀₁ ${formatValue(s.p0P01)}`}
              transform={`translate(${x(s.station)},${y(s.p0P01)})`}
              onPointerEnter={() => setActive(s.station)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(s.station)}
              onBlur={() => setActive(null)}
              className="outline-none"
            >
              <circle r={12} fill="transparent" />
              <circle r={4} className={cn('fill-up stroke-panel [stroke-width:2]', active === s.station && 'fill-ink')} />
            </g>
          ))}
        </g>
      </svg>
      {shown === undefined ? null : (
        <div
          role="tooltip"
          className="pointer-events-none absolute rounded-md border border-rule bg-panel px-2.5 py-1.5 text-xs shadow-sm"
          style={{ left: Math.min(MARGIN.left + x(shown.station) + 10, w - 150), top: MARGIN.top + y(shown.p0P01) - 34 }}
        >
          <span className="num font-medium text-ink">{formatValue(shown.p0P01)}</span>{' '}
          <span className="text-muted">{shown.station === 0 ? 'freestream' : `after shock ${shown.station}`}</span>
        </div>
      )}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-0.5 w-5 bg-up" /> {chainName}
        </li>
        {single === null ? null : (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block w-5 border-t-2 border-dashed border-down" /> single {plain(totalTurnDeg)}° shock
          </li>
        )}
      </ul>
    </div>
  )
}
