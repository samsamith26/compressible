import { scaleLog } from 'd3-scale'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cn } from '@/lib/cn'
import { formatValue } from '@/lib/format'
import { decadeTicks } from '@/lib/ticks'

export interface Jump {
  readonly key: string
  /** Label of the ratio, e.g. "p₂/p₁". */
  readonly label: string
  readonly ratio: number
}

interface JumpChartProps {
  readonly jumps: readonly Jump[]
  readonly stale?: boolean
}

const ROW = 34
const LABEL_W = 64
const VALUE_W = 64

/**
 * Before/after comparison across a shock: each property's downstream/upstream ratio as a bar
 * from 1 (state 1) on a log scale, so compression and losses read at the same visual weight.
 */
export function JumpChart({ jumps, stale = false }: JumpChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const ratios = jumps.map((j) => j.ratio)
  const lo = Math.min(0.1, ...ratios.map((r) => r / 4))
  const hi = Math.max(10, ...ratios.map((r) => r * 1.5))
  const plotW = Math.max(40, width - LABEL_W - VALUE_W)
  const x = scaleLog().domain([lo, hi]).range([0, plotW])
  const height = jumps.length * ROW + 34
  const one = x(1)

  return (
    <div className={cn('px-4 pb-3 pt-4 transition-opacity', stale && 'opacity-45')}>
      <div ref={ref}>
      <svg width={width} height={height} role="img" aria-label="Property ratios across the shock, state 2 over state 1, log scale">
        <title>Property ratios across the shock</title>
        <g transform={`translate(${LABEL_W},6)`}>
          {decadeTicks(lo, hi).map((t) => (
            <g key={t.value} transform={`translate(${x(t.value)},0)`} aria-hidden="true">
              <line y2={jumps.length * ROW} className={t.value === 1 ? 'stroke-ink/50' : 'stroke-grid'} strokeDasharray={t.value === 1 ? '3 3' : undefined} />
              <text y={jumps.length * ROW + 16} textAnchor="middle" className="num fill-muted text-[11px]">
                {t.label}
              </text>
            </g>
          ))}
          {jumps.map((j, i) => {
            const end = x(j.ratio)
            const gain = j.ratio >= 1
            return (
              <g key={j.key} transform={`translate(0,${i * ROW})`}>
                <text x={-10} y={ROW / 2} dy="0.32em" textAnchor="end" className="fill-ink text-[13px] font-medium">
                  {j.label}
                </text>
                <rect
                  className={cn('glide', gain ? 'fill-down' : 'fill-up')}
                  y={ROW / 2 - 7}
                  height={14}
                  width={1}
                  rx={0}
                  style={{ transform: `translateX(${Math.min(one, end)}px) scaleX(${Math.max(1, Math.abs(end - one))})` }}
                />
                <text
                  className="num glide fill-ink text-[12px]"
                  y={ROW / 2}
                  dy="0.32em"
                  textAnchor={gain ? 'start' : 'end'}
                  style={{ transform: `translateX(${end + (gain ? 6 : -6)}px)` }}
                >
                  {formatValue(j.ratio, 4)}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
      </div>
    </div>
  )
}
