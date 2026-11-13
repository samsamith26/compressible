import { Quantity } from '@/components/Quantity'
import { formatValue } from '@/lib/format'

export interface TooltipRow {
  readonly key: string
  readonly label: string
  readonly value: number
  readonly color?: string
}

/**
 * Hover/focus readout drawn inside the SVG (foreignObject keeps it in the chart's
 * coordinate space). Values lead, labels follow; rows are keyed with a stroke.
 */
export function ChartTooltip({
  x,
  y,
  areaWidth,
  title,
  rows,
}: {
  x: number
  y: number
  areaWidth: number
  title: string
  rows: readonly TooltipRow[]
}) {
  const w = 168
  const h = 26 + rows.length * 20
  const left = x + 12 + w > areaWidth ? x - 12 - w : x + 12
  return (
    <foreignObject x={left} y={Math.max(0, y - h / 2)} width={w} height={h} pointerEvents="none">
      <div className="rounded-md border border-rule bg-surface px-2.5 py-1.5 text-[13px] text-ink-2 shadow-sm">
        <div className="mb-0.5 text-ink-2">{title}</div>
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            {r.color !== undefined && (
              <svg width="12" height="6" aria-hidden="true">
                <line x1="0" x2="12" y1="3" y2="3" stroke={r.color} strokeWidth={2} />
              </svg>
            )}
            <span className="num font-bold text-ink">{formatValue(r.value, 4)}</span>
            <span>
              <Quantity label={r.label} />
            </span>
          </div>
        ))}
      </div>
    </foreignObject>
  )
}
