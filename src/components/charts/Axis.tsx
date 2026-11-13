interface Tick {
  readonly value: number
  readonly label: string
}

interface AxisProps {
  readonly ticks: readonly Tick[]
  readonly scale: (v: number) => number
  /** Length of the gridlines (the other axis's inner size). */
  readonly gridLength: number
  readonly title: string
}

/** Bottom axis with graph-paper gridlines, drawn inside a translated <g>. */
export function AxisBottom({ ticks, scale, gridLength, title }: AxisProps) {
  return (
    <g aria-hidden="true">
      {ticks.map((t) => (
        <g key={t.value} transform={`translate(${scale(t.value)},0)`}>
          <line y1={0} y2={-gridLength} className="stroke-grid" />
          <line y1={0} y2={5} className="stroke-rule" />
          <text y={18} textAnchor="middle" className="num fill-muted text-[11px]">
            {t.label}
          </text>
        </g>
      ))}
      <line x1={0} x2={scale(ticks.at(-1)?.value ?? 0)} className="stroke-rule" />
      <text x={scale(ticks.at(-1)?.value ?? 0)} y={34} textAnchor="end" className="fill-muted text-[11px]">
        {title}
      </text>
    </g>
  )
}

/** Left axis with graph-paper gridlines. */
export function AxisLeft({ ticks, scale, gridLength, title }: AxisProps) {
  return (
    <g aria-hidden="true">
      {ticks.map((t) => (
        <g key={t.value} transform={`translate(0,${scale(t.value)})`}>
          <line x1={0} x2={gridLength} className="stroke-grid" />
          <line x1={-5} x2={0} className="stroke-rule" />
          <text x={-8} dy="0.32em" textAnchor="end" className="num fill-muted text-[11px]">
            {t.label}
          </text>
        </g>
      ))}
      <text x={-8} y={-12} textAnchor="end" className="fill-muted text-[11px]">
        {title}
      </text>
    </g>
  )
}
