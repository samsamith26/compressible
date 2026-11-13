import { scaleLog } from 'd3-scale'
import { useState } from 'react'
import { SvgQuantity } from '@/components/Quantity'
import { formatValue } from '@/lib/format'
import { plainLabel } from '@/lib/quantity'
import { XAxis } from './Axes'
import { ChartFigure } from './ChartFigure'
import { jumpDomain, type JumpRow } from './jump'
import { Legend } from './Legend'
import { formatTick, niceLogTicks } from './scales'
import { ChartTooltip } from './Tooltip'

const ROW = 38
const LABEL_W = 78

/**
 * Before/after across a shock as dumbbells on one log axis: the upstream dot sits
 * at 1 (the reference) and the downstream dot at the ratio.
 */
export function JumpChart({ rows, stale }: { rows: readonly JumpRow[]; stale: boolean }) {
  const [active, setActive] = useState<string | null>(null)
  const height = rows.length * ROW + 52
  const [lo, hi] = jumpDomain(rows.map((r) => r.ratio))

  return (
    <ChartFigure
      title="Across the shock"
      summary={`Downstream divided by upstream on a log scale: ${rows.map((r) => `${plainLabel(r.label)} ${formatValue(r.ratio, 4)}`).join(', ')}.`}
      height={height}
      margin={{ top: 8, right: 20, bottom: 44, left: LABEL_W }}
      legend={
        <Legend
          items={[
            { key: 'up', label: 'Upstream (reference)', color: 'var(--s1)', dot: true },
            { key: 'down', label: 'Downstream', color: 'var(--s2)', dot: true },
          ]}
        />
      }
    >
      {(area) => {
        const x = scaleLog().domain([lo, hi]).range([area.x0, area.x1]).clamp(true)
        const ticks = niceLogTicks(lo, hi)
        const shown = rows.find((r) => r.key === active)
        return (
          <g className={stale ? 'opacity-45' : undefined}>
            <XAxis area={area} ticks={ticks} scale={x} format={formatTick} label="downstream ÷ upstream (log scale)" />
            <g role="list">
              {rows.map((r, i) => {
                const cy = area.y0 + ROW * i + ROW / 2
                const x1 = x(1)
                const x2 = x(r.ratio)
                const valueText = formatValue(r.ratio, 4)
                // A label left of a falling ratio's dot must clear the row label column;
                // if it would not, put it right of the upstream dot instead (~8px per glyph).
                const leftFits = x2 - 12 - valueText.length * 8 > area.x0
                const labelX = r.ratio >= 1 ? x2 + 10 : leftFits ? x2 - 10 : x1 + 10
                const labelAnchor = r.ratio >= 1 || !leftFits ? 'start' : 'end'
                return (
                  <g
                    key={r.key}
                    role="listitem"
                    tabIndex={0}
                    aria-label={`${plainLabel(r.label)}: ${formatValue(r.ratio)}`}
                    onPointerEnter={() => setActive(r.key)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(r.key)}
                    onBlur={() => setActive(null)}
                    className="outline-none focus-visible:[&>rect]:stroke-[var(--focus)]"
                  >
                    <rect x={0} y={cy - ROW / 2} width={area.x1} height={ROW} fill={active === r.key ? 'var(--accent)' : 'transparent'} stroke="transparent" strokeWidth={2} rx={4} />
                    <text x={8} y={cy} dy="0.32em" className="fill-ink text-[14px]">
                      <SvgQuantity label={r.label} />
                    </text>
                    <path d={`M${x1},${cy} H${x2}`} stroke="var(--ink-2)" strokeOpacity={0.55} strokeWidth={2} className="transition-geometry" />
                    <circle cx={x1} cy={cy} r={5} fill="var(--s1)" stroke="var(--bg)" strokeWidth={2} />
                    {/* Moved with a transform: geometry attributes like cx do not transition reliably. */}
                    <g className="transition-geometry" style={{ transform: `translate(${x2}px, ${cy}px)` }}>
                      <circle r={5} fill="var(--s2)" stroke="var(--bg)" strokeWidth={2} />
                    </g>
                    <text x={labelX} y={cy} dy="0.32em" textAnchor={labelAnchor} className="num fill-ink text-[13px]">
                      {valueText}
                    </text>
                  </g>
                )
              })}
            </g>
            {shown !== undefined && (
              <ChartTooltip
                x={x(shown.ratio)}
                y={area.y0 + ROW * rows.indexOf(shown) + ROW / 2}
                areaWidth={area.width}
                title={shown.ratio >= 1 ? `Rises ${formatValue(shown.ratio, 3)}×` : `Falls to ${formatValue(shown.ratio * 100, 3)}%`}
                rows={[{ key: shown.key, label: shown.label, value: shown.ratio, color: 'var(--s2)' }]}
              />
            )}
          </g>
        )
      }}
    </ChartFigure>
  )
}
