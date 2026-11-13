import type { ReactNode } from 'react'
import type { PlotArea } from './ChartFigure'

/** Hairline grid plus tick labels along the bottom edge. */
export function XAxis({
  area,
  ticks,
  scale,
  format,
  label,
}: {
  area: PlotArea
  ticks: readonly number[]
  scale: (v: number) => number
  format: (v: number) => string
  label: ReactNode
}) {
  return (
    <g aria-hidden="true">
      {ticks.map((t) => (
        <g key={t} transform={`translate(${scale(t)} 0)`}>
          <line y1={area.y0} y2={area.y1} stroke="var(--grid)" strokeWidth={1} />
          <text y={area.y1 + 16} textAnchor="middle" className="num fill-ink-2 text-[12px]">
            {format(t)}
          </text>
        </g>
      ))}
      <line x1={area.x0} x2={area.x1} y1={area.y1} y2={area.y1} stroke="var(--rule)" strokeWidth={1} />
      <text x={area.x1} y={area.y1 + 34} textAnchor="end" className="fill-ink-2 text-[13px]">
        {label}
      </text>
    </g>
  )
}

/** Hairline grid plus tick labels along the left edge. */
export function YAxis({
  area,
  ticks,
  scale,
  format,
  label,
}: {
  area: PlotArea
  ticks: readonly number[]
  scale: (v: number) => number
  format: (v: number) => string
  label: ReactNode
}) {
  return (
    <g aria-hidden="true">
      {ticks.map((t) => (
        <g key={t} transform={`translate(0 ${scale(t)})`}>
          <line x1={area.x0} x2={area.x1} stroke="var(--grid)" strokeWidth={1} />
          <text x={area.x0 - 8} dy="0.32em" textAnchor="end" className="num fill-ink-2 text-[12px]">
            {format(t)}
          </text>
        </g>
      ))}
      <text x={area.x0} y={area.y0 - 10} textAnchor="start" className="fill-ink-2 text-[13px]">
        {label}
      </text>
    </g>
  )
}
