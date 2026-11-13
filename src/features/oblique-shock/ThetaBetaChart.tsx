import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { XAxis, YAxis } from '@/components/charts/Axes'
import { ChartFigure, type PlotArea } from '@/components/charts/ChartFigure'
import { Legend } from '@/components/charts/Legend'
import { clampToRange, formatTick } from '@/components/charts/scales'
import { ChartTooltip } from '@/components/charts/Tooltip'
import { SvgQuantity } from '@/components/Quantity'
import { usePointerDrag } from '@/hooks/usePointerDrag'
import { cn } from '@/lib/utils'
import { thetaFromBetaDeg } from '@/physics'
import { selectedState, thetaBetaCurves, thetaMaxLocus, type ObliqueView } from './model'

const REFERENCE_MACHS = [1.2, 1.5, 2, 3, 5, 10]
type Pt = readonly [number, number]

export function ThetaBetaChart({
  view,
  gamma,
  onSetBeta,
  stale,
}: {
  view: ObliqueView
  gamma: number
  onSetBeta: (betaDeg: number) => void
  stale: boolean
}) {
  const [hoverBeta, setHoverBeta] = useState<number | null>(null)
  const reference = useMemo(() => thetaBetaCurves(gamma, REFERENCE_MACHS), [gamma])
  const current = useMemo(() => thetaBetaCurves(gamma, [view.m1])[0], [gamma, view.m1])
  const locus = useMemo(() => thetaMaxLocus(gamma), [gamma])
  const requested = view.kind === 'detached' ? view.thetaDeg : null
  const yMax = Math.min(90, Math.max(46, (requested ?? 0) + 4))

  return (
    <ChartFigure
      title="θ-β-M"
      summary={`Turn angle θ against wave angle β for several upstream Mach numbers, with the current M1 = ${view.m1} curve highlighted. Drag the point or use the arrow keys to change the wave angle.`}
      height={320}
      margin={{ top: 26, right: 18, bottom: 42, left: 44 }}
      legend={
        <Legend
          items={[
            { key: 'cur', label: `M_1 = ${Number(view.m1.toPrecision(4))}`, color: 'var(--s1)' },
            { key: 'ref', label: 'other M_1', color: 'var(--ink-2)' },
            { key: 'max', label: 'θ_{max}', color: 'var(--ink-2)', dashed: true },
          ]}
        />
      }
    >
      {(area) => (
        <Plot
          area={area}
          view={view}
          gamma={gamma}
          reference={reference}
          current={current?.points ?? []}
          locus={locus}
          requested={requested}
          yMax={yMax}
          onSetBeta={onSetBeta}
          hoverBeta={hoverBeta}
          setHoverBeta={setHoverBeta}
          stale={stale}
        />
      )}
    </ChartFigure>
  )
}

function Plot({
  area,
  view,
  gamma,
  reference,
  current,
  locus,
  requested,
  yMax,
  onSetBeta,
  hoverBeta,
  setHoverBeta,
  stale,
}: {
  area: PlotArea
  view: ObliqueView
  gamma: number
  reference: readonly { m1: number; points: readonly Pt[] }[]
  current: readonly Pt[]
  locus: readonly Pt[]
  requested: number | null
  yMax: number
  onSetBeta: (b: number) => void
  hoverBeta: number | null
  setHoverBeta: (b: number | null) => void
  stale: boolean
}) {
  const x = scaleLinear().domain([0, 90]).range([area.x0, area.x1])
  const y = scaleLinear().domain([0, yMax]).range([area.y1, area.y0])
  const path = line<Pt>()
    .x((p) => x(p[0]))
    .y((p) => y(p[1]))
  const beta = (px: number) => clampToRange(x.invert(px), [0, 90])
  const drag = usePointerDrag((px) => onSetBeta(beta(px)))

  const sel = view.kind === 'attached' ? selectedState(view) : null
  const other = view.kind === 'attached' ? (view.selected === 'weak' ? view.strong : view.weak) : null
  const pointBeta = sel?.betaDeg ?? view.max.betaDeg
  const pointTheta = sel?.thetaDeg ?? view.max.thetaMaxDeg
  const mu = (Math.asin(1 / view.m1) * 180) / Math.PI

  function onKeyDown(e: KeyboardEvent<SVGGElement>) {
    const step = e.shiftKey ? 1 : 0.1
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : 0
    if (delta === 0) return
    e.preventDefault()
    onSetBeta(Math.round((pointBeta + delta) * 100) / 100)
  }

  const hoverTheta = hoverBeta === null ? null : thetaFromBetaDeg(view.m1, Math.max(mu, hoverBeta), gamma)

  return (
    <g className={cn(drag.dragging && 'is-dragging', stale && 'opacity-60')}>
      <YAxis area={area} ticks={y.ticks(6)} scale={y} format={formatTick} label="turn angle θ (°)" />
      <XAxis area={area} ticks={[0, 15, 30, 45, 60, 75, 90]} scale={x} format={formatTick} label="wave angle β (°)" />

      <g aria-hidden="true">
        {reference.map((c) => {
          const peak = c.points.reduce((a, b) => (b[1] > a[1] ? b : a))
          return (
            <g key={c.m1}>
              <path d={path(c.points) ?? ''} fill="none" stroke="var(--ink-2)" strokeOpacity={0.35} strokeWidth={1} />
              <text x={x(peak[0])} y={y(peak[1]) - 6} textAnchor="middle" className="fill-ink-2 text-[11px]" stroke="var(--bg)" strokeWidth={3} paintOrder="stroke">
                {c.m1}
              </text>
            </g>
          )
        })}
        <path d={path(locus) ?? ''} fill="none" stroke="var(--ink-2)" strokeWidth={1} strokeDasharray="4 3" />
        <path d={path(current) ?? ''} fill="none" stroke="var(--s1)" strokeWidth={2} />
        {requested !== null && (
          <g>
            <line x1={area.x0} x2={area.x1} y1={y(requested)} y2={y(requested)} stroke="var(--detached)" strokeWidth={1.5} strokeDasharray="5 3" />
            <text x={area.x0 + 6} y={y(requested) - 6} className="fill-ink text-[12px]" stroke="var(--bg)" strokeWidth={3} paintOrder="stroke">
              θ = {Number(requested.toPrecision(4))}° is above <SvgQuantity label="θ_{max}" />: no attached shock
            </text>
          </g>
        )}
        {sel !== null && (
          <line x1={area.x0} x2={x(Math.max(pointBeta, other?.betaDeg ?? 0))} y1={y(pointTheta)} y2={y(pointTheta)} stroke="var(--ink-2)" strokeOpacity={0.6} strokeDasharray="2 3" className="transition-geometry" />
        )}
        {other !== null && <circle cx={x(other.betaDeg)} cy={y(other.thetaDeg)} r={5} fill="var(--bg)" stroke="var(--ink-2)" strokeWidth={1.5} />}
      </g>

      {hoverBeta !== null && hoverTheta !== null && (
        <line x1={x(hoverBeta)} x2={x(hoverBeta)} y1={area.y0} y2={area.y1} stroke="var(--ink-2)" strokeWidth={1} aria-hidden="true" />
      )}

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
          if (rect !== undefined) setHoverBeta(beta(e.clientX - rect.left))
        }}
        onPointerLeave={() => setHoverBeta(null)}
      />

      <g
        role="slider"
        tabIndex={0}
        aria-label="Wave angle β on the θ-β-M chart"
        aria-valuemin={Number(mu.toFixed(2))}
        aria-valuemax={90}
        aria-valuenow={Number(pointBeta.toFixed(2))}
        aria-valuetext={`β ${pointBeta.toFixed(1)}°, θ ${pointTheta.toFixed(1)}°${view.kind === 'attached' ? `, ${view.selected} shock` : ', detached'}`}
        onKeyDown={onKeyDown}
        className="cursor-grab outline-none [&:focus-visible>.ring]:opacity-100"
        style={{ transform: `translate(${x(pointBeta)}px, ${y(pointTheta)}px)` }}
        {...drag.handlers}
      >
        <circle r={14} fill="transparent" />
        <circle className="ring opacity-0" r={10} fill="none" stroke="var(--focus)" strokeWidth={2} />
        <circle
          r={6.5}
          fill={view.kind === 'attached' ? 'var(--ink)' : 'var(--bg)'}
          stroke={view.kind === 'attached' ? 'var(--bg)' : 'var(--detached)'}
          strokeWidth={2}
          className="transition-geometry"
        />
      </g>

      {hoverBeta !== null && hoverTheta !== null && (
        <ChartTooltip
          x={x(hoverBeta)}
          y={y(hoverTheta)}
          areaWidth={area.width}
          title={`On the M₁ = ${Number(view.m1.toPrecision(4))} curve`}
          rows={[
            { key: 'b', label: 'β (°)', value: Math.max(mu, hoverBeta) },
            { key: 't', label: 'θ (°)', value: hoverTheta, color: 'var(--s1)' },
          ]}
        />
      )}
    </g>
  )
}
