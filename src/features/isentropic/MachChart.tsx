import { scaleLinear, scaleLog } from 'd3-scale'
import { line } from 'd3-shape'
import { useState, type KeyboardEvent } from 'react'
import { XAxis, YAxis } from '@/components/charts/Axes'
import { ChartFigure, type Margin } from '@/components/charts/ChartFigure'
import { Legend } from '@/components/charts/Legend'
import { clampToRange, formatTick, niceLogTicks, separatedLabels } from '@/components/charts/scales'
import { ChartTooltip } from '@/components/charts/Tooltip'
import { SvgQuantity } from '@/components/Quantity'
import { usePointerDrag } from '@/hooks/usePointerDrag'
import { formatValue } from '@/lib/format'
import { plainLabel } from '@/lib/quantity'
import { cn } from '@/lib/utils'
import type { RatioPoint } from './model'

export interface MachSeries {
  readonly key: string
  /** Quantity label markup. */
  readonly label: string
  /** CSS colour for the mark. */
  readonly color: string
  readonly y: (p: RatioPoint) => number
}

const MARGIN: Margin = { top: 26, right: 16, bottom: 42, left: 44 }

const M_MIN = 0.05

/** Ratio(s) against Mach number with a draggable, keyboard-operable marker at the current M. */
export function MachChart({
  title,
  summary,
  points,
  xMax,
  series,
  yScale,
  yDomain,
  current,
  onSetMach,
  labelAtMach,
}: {
  title: string
  summary: string
  points: readonly RatioPoint[]
  xMax: number
  series: readonly MachSeries[]
  yScale: 'linear' | 'log'
  yDomain: readonly [number, number]
  /** The current state as a ratio point (marker position). */
  current: RatioPoint
  onSetMach: (mach: number) => void
  /** Where to put direct labels (curves are well separated there). */
  labelAtMach?: number
}) {
  const [hover, setHover] = useState<RatioPoint | null>(null)
  const multi = series.length > 1

  return (
    <ChartFigure
      title={title}
      summary={summary}
      height={240}
      margin={MARGIN}
      legend={multi ? <Legend items={series.map((s) => ({ key: s.key, label: s.label, color: s.color }))} /> : undefined}
    >
      {(area) => (
        <MachPlot
          area={area}
          points={points}
          xMax={xMax}
          series={series}
          yScale={yScale}
          yDomain={yDomain}
          current={current}
          onSetMach={onSetMach}
          hover={hover}
          setHover={setHover}
          labelAtMach={multi ? labelAtMach : undefined}
          title={title}
        />
      )}
    </ChartFigure>
  )
}

function MachPlot({
  area,
  points,
  xMax,
  series,
  yScale,
  yDomain,
  current,
  onSetMach,
  hover,
  setHover,
  labelAtMach,
  title,
}: {
  area: { x0: number; x1: number; y0: number; y1: number; width: number; height: number; margin: Margin }
  points: readonly RatioPoint[]
  xMax: number
  series: readonly MachSeries[]
  yScale: 'linear' | 'log'
  yDomain: readonly [number, number]
  current: RatioPoint
  onSetMach: (mach: number) => void
  hover: RatioPoint | null
  setHover: (p: RatioPoint | null) => void
  labelAtMach: number | undefined
  title: string
}) {
  const x = scaleLinear().domain([0, xMax]).range([area.x0, area.x1])
  const yLin = scaleLinear().domain([yDomain[0], yDomain[1]]).range([area.y1, area.y0])
  const yLog = scaleLog().domain([yDomain[0], yDomain[1]]).range([area.y1, area.y0])
  const y = (v: number) => clampToRange(yScale === 'log' ? yLog(Math.max(v, yDomain[0])) : yLin(v), [area.y0, area.y1])
  const yTicks = yScale === 'log' ? niceLogTicks(yDomain[0], yDomain[1]) : yLin.ticks(5)
  const xTicks = x.ticks(Math.max(3, Math.floor((area.x1 - area.x0) / 70)))

  const mach = (px: number) => clampToRange(x.invert(px), [M_MIN, xMax])
  const drag = usePointerDrag((px) => onSetMach(mach(px)))
  const nearest = (m: number) => points.reduce((a, b) => (Math.abs(b.mach - m) < Math.abs(a.mach - m) ? b : a))

  const cx = clampToRange(x(current.mach), [area.x0, area.x1])
  const labelPoint = labelAtMach === undefined ? undefined : nearest(labelAtMach)

  function onKeyDown(e: KeyboardEvent<SVGGElement>) {
    const step = e.shiftKey ? 1 : 0.1
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : 0
    if (delta === 0) return
    e.preventDefault()
    onSetMach(clampToRange(Math.round((current.mach + delta) * 100) / 100, [M_MIN, xMax]))
  }

  return (
    <g className={cn(drag.dragging && 'is-dragging')}>
      <YAxis area={area} ticks={yTicks} scale={y} format={formatTick} label={yScale === 'log' ? `${plainLabel(series[0]?.label ?? '')} (log scale)` : 'ratio'} />
      <XAxis area={area} ticks={xTicks} scale={x} format={formatTick} label="Mach number M" />
      <line x1={x(1)} x2={x(1)} y1={area.y0} y2={area.y1} stroke="var(--ink-2)" strokeOpacity={0.4} strokeDasharray="3 3" aria-hidden="true" />

      {series.map((s) => (
        <path key={s.key} d={line<RatioPoint>().x((p) => x(p.mach)).y((p) => y(s.y(p)))(points.filter((p) => p.mach <= xMax)) ?? ''} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" aria-hidden="true" />
      ))}

      {labelPoint !== undefined &&
        separatedLabels(series, (s) => y(s.y(labelPoint)), 13).map((s) => (
          <text
            key={s.key}
            x={x(labelPoint.mach) + 4}
            y={y(s.y(labelPoint)) - 7}
            className="fill-ink-2 text-[12px]"
            stroke="var(--bg)"
            strokeWidth={4}
            paintOrder="stroke"
            aria-hidden="true"
          >
            <SvgQuantity label={s.label} />
          </text>
        ))}

      {hover !== null && <line x1={x(hover.mach)} x2={x(hover.mach)} y1={area.y0} y2={area.y1} stroke="var(--ink-2)" strokeWidth={1} aria-hidden="true" />}

      {/* Hit area: click or drag anywhere on the plot to set M; hover shows values. */}
      <rect
        x={area.x0}
        y={area.y0}
        width={area.x1 - area.x0}
        height={area.y1 - area.y0}
        fill="transparent"
        className="cursor-ew-resize"
        {...drag.handlers}
        onPointerMove={(e) => {
          drag.handlers.onPointerMove(e)
          const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
          if (rect !== undefined) setHover(nearest(mach(e.clientX - rect.left)))
        }}
        onPointerLeave={() => setHover(null)}
      />

      <g
        role="slider"
        tabIndex={0}
        aria-label={`${title}: Mach number`}
        aria-valuemin={M_MIN}
        aria-valuemax={xMax}
        aria-valuenow={current.mach}
        aria-valuetext={`M ${formatValue(current.mach, 4)}`}
        onKeyDown={onKeyDown}
        className="outline-none [&:focus-visible>circle.ring]:opacity-100"
        style={{ transform: `translateX(${cx}px)` }}
      >
        <line y1={area.y0} y2={area.y1} stroke="var(--ink)" strokeWidth={1.5} pointerEvents="none" className="transition-geometry" />
        {series.map((s) => (
          <circle key={s.key} cy={y(s.y(current))} r={4.5} fill={s.color} stroke="var(--bg)" strokeWidth={2} pointerEvents="none" className="transition-geometry" />
        ))}
        <circle className="ring opacity-0" cy={area.y1} r={9} fill="none" stroke="var(--focus)" strokeWidth={2} />
        <circle cy={area.y1} r={6} fill="var(--ink)" stroke="var(--bg)" strokeWidth={2} />
      </g>

      {hover !== null && (
        <ChartTooltip
          x={x(hover.mach)}
          y={(area.y0 + area.y1) / 2}
          areaWidth={area.width}
          title={`M ${formatValue(hover.mach, 3)}`}
          rows={series.map((s) => ({ key: s.key, label: s.label, value: s.y(hover), color: s.color }))}
        />
      )}
    </g>
  )
}
