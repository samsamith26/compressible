import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import { useMemo, type KeyboardEvent } from 'react'
import { AxisBottom, AxisLeft } from '@/components/charts/Axis'
import { chartBox } from '@/components/charts/layout'
import { useElementWidth } from '@/hooks/useElementWidth'
import type { DragHandlers, Point } from '@/hooks/usePointerDrag'
import { cn } from '@/lib/cn'
import { formatValue } from '@/lib/format'
import type { MaxDeflection } from '@/physics'
import { MACH_FAMILY, machCurve, nearestIndex, thetaAxisMax, thetaMaxLocus, type ThetaBeta } from './thetaBeta'

const MARGIN = { top: 20, right: 20, bottom: 42, left: 46 }

interface ThetaBetaChartProps {
  readonly m1: number
  readonly gamma: number
  readonly max: MaxDeflection
  /** Operating point when attached. */
  readonly point: ThetaBeta | null
  /** Typed θ when detached (drawn beyond the curve). */
  readonly detachedThetaDeg: number | null
  readonly onBeta: (betaDeg: number) => void
  readonly drag: { readonly dragging: boolean; readonly bind: (onMove: (p: Point) => void) => DragHandlers }
  readonly stale: boolean
}

const toPath = line<readonly [number, number]>()
  .x((d) => d[0])
  .y((d) => d[1])

/** θ-β-M diagram with a family of Mach curves, the θmax locus and a draggable operating point. */
export function ThetaBetaChart({ m1, gamma, max, point, detachedThetaDeg, onBeta, drag, stale }: ThetaBetaChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const box = chartBox(width, 0.62, MARGIN, 260, 440)
  const { inner } = box

  const thetaMax = thetaAxisMax(gamma)
  const x = scaleLinear().domain([0, thetaMax]).range([0, inner.width])
  const y = scaleLinear().domain([0, 90]).range([inner.height, 0])

  const family = useMemo(() => MACH_FAMILY.map((m) => ({ m, curve: machCurve(m, gamma, 120) })), [gamma])
  const current = useMemo(() => machCurve(m1, gamma, 400), [m1, gamma])
  const locus = useMemo(() => thetaMaxLocus(gamma), [gamma])
  const px = (p: ThetaBeta): readonly [number, number] => [x(p.thetaDeg), y(p.betaDeg)]
  const mu = current[0]?.betaDeg ?? 0

  const onMove = (p: Point): void => {
    const pixels = current.map((c) => ({ x: x(c.thetaDeg), y: y(c.betaDeg) }))
    const i = nearestIndex(pixels, { x: p.x - MARGIN.left, y: p.y - MARGIN.top })
    const hit = current[i]
    if (hit !== undefined) onBeta(hit.betaDeg)
  }

  const beta = point?.betaDeg ?? max.betaDeg
  const onKeyDown = (e: KeyboardEvent<SVGGElement>): void => {
    const step = e.shiftKey ? 1 : 0.1
    const delta = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? step : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -step : null
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      onBeta(e.key === 'Home' ? mu : 90)
      return
    }
    if (delta === null) return
    e.preventDefault()
    onBeta(Math.min(90, Math.max(mu, Number((beta + delta).toFixed(6)))))
  }

  const branch = point === null ? null : point.betaDeg <= max.betaDeg ? 'weak' : 'strong'

  return (
    <div ref={ref} className={cn('select-none transition-opacity', stale && 'opacity-45')}>
      <svg width={box.width} height={box.height} className={cn('touch-none', drag.dragging ? 'dragging cursor-grabbing' : 'cursor-crosshair')} {...drag.bind(onMove)}>
        <title>θ-β-M diagram</title>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          <g transform={`translate(0,${inner.height})`}>
            <AxisBottom
              ticks={x.ticks(Math.max(4, Math.floor(inner.width / 60))).map((v) => ({ value: v, label: `${v}°` }))}
              scale={x}
              gridLength={inner.height}
              title="turning angle θ"
            />
          </g>
          <AxisLeft ticks={[0, 15, 30, 45, 60, 75, 90].map((v) => ({ value: v, label: `${v}°` }))} scale={y} gridLength={inner.width} title="β" />

          <g aria-hidden="true">
            {family.map(({ m, curve }) => {
              const peak = curve.reduce((a, b) => (b.thetaDeg > a.thetaDeg ? b : a))
              return (
                <g key={m}>
                  <path d={toPath(curve.map(px)) ?? ''} className="fill-none stroke-muted/45" strokeWidth={1} />
                  {Math.abs(m - m1) < 1e-9 ? null : (
                    <text x={x(peak.thetaDeg) + 4} y={y(peak.betaDeg) - 9} className="num fill-muted text-[10px]">
                      M {m}
                    </text>
                  )}
                </g>
              )
            })}
            <path d={toPath(locus.map(px)) ?? ''} className="fill-none stroke-ink/50" strokeDasharray="4 4" />
            <text x={inner.width - 4} y={y(80)} textAnchor="end" className="fill-muted text-[11px]">
              strong
            </text>
            <text x={inner.width - 4} y={y(40)} textAnchor="end" className="fill-muted text-[11px]">
              weak
            </text>
            <path d={toPath(current.map(px)) ?? ''} className="fill-none stroke-up" strokeWidth={2.4} />
            <circle cx={x(max.thetaMaxDeg)} cy={y(max.betaDeg)} r={3.5} className="fill-panel stroke-ink" />
            <text x={x(max.thetaMaxDeg) + 6} y={y(max.betaDeg) + 16} className="num fill-up text-[11px] font-medium">
              M₁ {formatValue(m1, 4)} · θmax {formatValue(max.thetaMaxDeg, 4)}°
            </text>
          </g>

          {detachedThetaDeg !== null && point === null ? (
            <g aria-hidden="true">
              <line
                x1={x(Math.min(detachedThetaDeg, thetaMax))}
                x2={x(Math.min(detachedThetaDeg, thetaMax))}
                y2={inner.height}
                className="stroke-down"
                strokeDasharray="6 4"
                strokeWidth={1.5}
              />
              <text x={x(Math.min(detachedThetaDeg, thetaMax)) - 6} y={14} textAnchor="end" className="fill-down text-[11px] font-medium">
                detached: θ &gt; θmax
              </text>
            </g>
          ) : null}

          {point === null ? null : (
            <g
              className="glide outline-none [&:focus-visible_.halo]:opacity-100"
              style={{ transform: `translate(${x(point.thetaDeg)}px, ${y(point.betaDeg)}px)` }}
              role="slider"
              tabIndex={0}
              aria-label="Wave angle β on the θ-β-M curve"
              aria-valuemin={mu}
              aria-valuemax={90}
              aria-valuenow={point.betaDeg}
              aria-valuetext={`β ${formatValue(point.betaDeg, 4)}°, θ ${formatValue(point.thetaDeg, 4)}°, ${branch ?? ''} shock`}
              onKeyDown={onKeyDown}
            >
              <line x2={-x(point.thetaDeg)} className="stroke-up/60" strokeDasharray="2 3" />
              <line y2={inner.height - y(point.betaDeg)} className="stroke-up/60" strokeDasharray="2 3" />
              <circle r={14} className="halo fill-none stroke-ring opacity-0" strokeWidth={2} />
              <circle r={9} className="fill-up/20" />
              <circle r={5} className="fill-up stroke-panel" strokeWidth={2} />
              <text x={10} y={-10} className="fill-up text-[11px] font-medium">
                {branch}
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  )
}
