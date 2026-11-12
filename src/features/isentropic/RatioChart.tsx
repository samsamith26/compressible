import { scaleLinear, scaleLog } from 'd3-scale'
import { line } from 'd3-shape'
import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { AxisBottom, AxisLeft } from '@/components/charts/Axis'
import { chartBox } from '@/components/charts/layout'
import { useElementWidth } from '@/hooks/useElementWidth'
import { usePointerDrag } from '@/hooks/usePointerDrag'
import { cn } from '@/lib/cn'
import { formatValue } from '@/lib/format'
import { nudge } from '@/lib/nudge'
import { spreadLabels } from '@/lib/spreadLabels'
import { decadeTicks } from '@/lib/ticks'
import type { IsentropicState } from '@/physics'
import { CURVE_KEYS, machAxisMax, ratioCurves, type CurveKey } from './ratioCurves'

const CURVES: Readonly<Record<CurveKey, { label: string; className: string }>> = {
  aAStar: { label: 'A/A*', className: 'stroke-down fill-down' },
  tT0: { label: 'T/T₀', className: 'stroke-teal fill-teal' },
  rhoRho0: { label: 'ρ/ρ₀', className: 'stroke-violet fill-violet' },
  pP0: { label: 'p/p₀', className: 'stroke-up fill-up' },
}

const MARGIN = { top: 28, right: 56, bottom: 42, left: 52 }
const M_MIN = 0.02

interface RatioChartProps {
  readonly state: IsentropicState
  readonly gamma: number
  readonly onMach: (mach: number) => void
  readonly stale: boolean
}

/** Isentropic ratios vs Mach number (log y) with a draggable, keyboard-operable marker at M. */
export function RatioChart({ state, gamma, onMach, stale }: RatioChartProps) {
  const clipId = useId()
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [frozenMax, setFrozenMax] = useState<number | null>(null)
  const box = chartBox(width, 0.55, MARGIN)
  const { inner } = box

  const liveMax = machAxisMax(state.mach)
  const drag = usePointerDrag()
  // Keep the axis still while dragging, so the point under the pointer does not run away.
  const xMax = drag.dragging && frozenMax !== null ? frozenMax : liveMax

  const curves = useMemo(() => ratioCurves(gamma, xMax), [gamma, xMax])
  const x = scaleLinear().domain([0, xMax]).range([0, inner.width])
  const y = scaleLog().domain(curves.yDomain).range([inner.height, 0]).clamp(true)
  const path = line<readonly [number, number]>()
    .x((d) => d[0])
    .y((d) => d[1])
  const xTicks = x.ticks(Math.max(3, Math.floor(inner.width / 70))).map((v) => ({ value: v, label: String(v) }))

  const endYs = spreadLabels(CURVE_KEYS.map((k) => y(curves.values[k].at(-1) ?? 1)), 14)
  const mx = x(Math.min(state.mach, xMax))

  const onKeyDown = (e: KeyboardEvent<SVGGElement>): void => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
    if (dir === 0) return
    e.preventDefault()
    onMach(Math.max(M_MIN, nudge(state.mach, dir, e.shiftKey)))
  }

  return (
    <div ref={ref} className={cn('select-none transition-opacity', stale && 'opacity-45')}>
      <svg
        width={box.width}
        height={box.height}
        className={cn('touch-none', drag.dragging ? 'dragging cursor-grabbing' : 'cursor-crosshair')}
        {...drag.bind(
          (p) => onMach(Math.min(xMax, Math.max(M_MIN, x.invert(p.x - MARGIN.left)))),
          () => setFrozenMax(liveMax),
        )}
      >
        <title>Isentropic ratios against Mach number</title>
        <defs>
          <clipPath id={clipId}>
            <rect width={inner.width} height={inner.height} />
          </clipPath>
        </defs>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          <g transform={`translate(0,${inner.height})`}>
            <AxisBottom ticks={xTicks} scale={x} gridLength={inner.height} title="Mach number M" />
          </g>
          <AxisLeft ticks={decadeTicks(...curves.yDomain)} scale={y} gridLength={inner.width} title="ratio" />

          {xMax >= 1 ? (
            <g transform={`translate(${x(1)},0)`} aria-hidden="true">
              <line y2={inner.height} className="stroke-muted" strokeDasharray="2 4" />
              <text y={-8} textAnchor="middle" className="fill-muted text-[10px]">
                sonic
              </text>
            </g>
          ) : null}

          <g clipPath={`url(#${clipId})`} aria-hidden="true">
            {CURVE_KEYS.map((k) => (
              <path
                key={k}
                d={path(curves.values[k].map((v, i) => [x(curves.machs[i] ?? 0), y(v)] as const)) ?? ''}
                className={cn(CURVES[k].className, 'fill-none!')}
                strokeWidth={k === 'aAStar' ? 2 : 1.6}
              />
            ))}
          </g>

          {CURVE_KEYS.map((k, i) => (
            <text key={k} x={inner.width + 6} y={endYs[i]} dy="0.32em" className={cn(CURVES[k].className, 'stroke-none! text-[11px] font-medium')}>
              {CURVES[k].label}
            </text>
          ))}

          <g
            className="glide outline-none [&:focus-visible_.halo]:opacity-100"
            style={{ transform: `translateX(${mx}px)` }}
            role="slider"
            tabIndex={0}
            aria-label="Mach number"
            aria-valuemin={M_MIN}
            aria-valuemax={xMax}
            aria-valuenow={state.mach}
            aria-valuetext={`M = ${formatValue(state.mach, 4)}`}
            onKeyDown={onKeyDown}
          >
            <line y2={inner.height} className="stroke-ink" strokeWidth={1} />
            <rect x={-26} y={-24} width={52} height={18} rx={4} className="fill-ink" />
            <text y={-11} textAnchor="middle" className="num fill-paper text-[11px]">
              {formatValue(state.mach, 4)}
            </text>
            <circle r={14} cy={inner.height} className="halo fill-none stroke-ring opacity-0" strokeWidth={2} />
            <circle r={6} cy={inner.height} className="fill-ink" />
          </g>
          {CURVE_KEYS.map((k) => (
            <circle
              key={k}
              r={4}
              className={cn('glide stroke-panel', CURVES[k].className)}
              strokeWidth={2}
              style={{ transform: `translate(${mx}px, ${y(state[k])}px)` }}
              aria-hidden="true"
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
