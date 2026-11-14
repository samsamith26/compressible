import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useDocumentTheme } from '@/hooks/useDocumentTheme'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cn } from '@/lib/cn'
import { formatValue } from '@/lib/format'
import { cornerFromPointer, nudgeCorner, wallAngleBefore } from './corner'
import { fieldFrame } from './frame'
import type { InletGeometry, Pt } from './geometry'
import { regionRows } from './labels'
import type { Chain, Ramp, ShadeProperty } from './model'
import { RegionTooltip } from './RegionTooltip'
import { labelInk, shadeColor, shadeValue } from './shade'

interface FlowFieldProps {
  readonly label: string
  readonly geometry: InletGeometry
  readonly chain: Chain
  readonly ramps: readonly Ramp[]
  readonly property: ShadeProperty
  readonly domain: readonly [number, number]
  /** Highlighted shock, 1-based; null for none. */
  readonly selected: number | null
  /** Read-only drawings (the comparison) omit the controls. */
  readonly interactive: boolean
  readonly maxHeight?: number
  readonly onSelectShock?: (shock: number) => void
  readonly onCorner?: (index0: number, ramp: Ramp) => void
  readonly stale?: boolean
}

/**
 * The ramps, their shocks at true absolute angles, and the regions between them shaded by a
 * chosen property. Regions are focusable buttons with a tooltip (click or Enter pins it); ramp
 * corners are sliders that drag or step the ramp's angle and length.
 */
export function FlowField({
  label,
  geometry: g,
  chain,
  ramps,
  property,
  domain,
  selected,
  interactive,
  maxHeight = 340,
  onSelectShock,
  onCorner,
  stale = false,
}: FlowFieldProps) {
  const id = useId()
  const theme = useDocumentTheme()
  const [ref, available] = useElementWidth<HTMLDivElement>()
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const f = fieldFrame(g.bounds, available, maxHeight)

  const P = (p: Pt) => `${f.toX(p.x).toFixed(1)},${f.toY(p.y).toFixed(1)}`
  const path = (pts: readonly Pt[]) => `M${pts.map(P).join('L')}Z`
  const clipX = g.conflict === null ? null : f.toX(g.conflict.at.x)
  const clip = `${id}-clip`
  const hatch = `${id}-hatch`
  const shown = hovered ?? focused ?? pinned
  const shownRegion = chain.regions.find((r) => r.index === shown)
  const shownShape = g.regions.find((r) => r.index === shown)

  const body = [
    { x: g.bounds.x0, y: 0 },
    ...g.corners,
    { x: g.bounds.x1, y: f.toModel(0, f.floorY).y },
    { x: g.bounds.x0, y: f.toModel(0, f.floorY).y },
  ]

  function togglePin(index: number) {
    setPinned((p) => (p === index ? null : index))
  }

  function cornerPointer(e: PointerEvent<SVGCircleElement>, index0: number) {
    const svg = e.currentTarget.ownerSVGElement
    const previous = g.corners[index0]
    if (svg === null || previous === undefined || onCorner === undefined) return
    const box = svg.getBoundingClientRect()
    const point = f.toModel(e.clientX - box.left, e.clientY - box.top)
    onCorner(index0, cornerFromPointer(previous, wallAngleBefore(ramps, index0), point))
  }

  function cornerKey(e: KeyboardEvent<SVGCircleElement>, index0: number) {
    const ramp = ramps[index0]
    if (ramp === undefined || onCorner === undefined) return
    const next = nudgeCorner(ramp, e.key, e.shiftKey)
    if (next === null) return
    e.preventDefault()
    onCorner(index0, next)
  }

  return (
    <div ref={ref} className={cn('relative min-w-0 transition-opacity', stale && 'opacity-45')}>
      <svg
        role="group"
        aria-label={label}
        width={f.width}
        height={f.height}
        viewBox={`0 0 ${f.width} ${f.height}`}
        className={cn('block max-w-full touch-none select-none', dragging !== null && 'dragging')}
      >
        <defs>
          <clipPath id={clip}>
            <rect x={0} y={0} width={clipX ?? f.width} height={f.height} />
          </clipPath>
          <pattern id={hatch} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={6} stroke="var(--muted)" strokeWidth={1} strokeOpacity={0.5} />
          </pattern>
        </defs>

        <g clipPath={`url(#${clip})`}>
          {g.regions.map((shape) => {
            const region = chain.regions.find((r) => r.index === shape.index)
            if (region === undefined) return null
            const fill = shadeColor(shadeValue(region, property), domain, theme)
            const summary = regionRows(region)
              .map(([name, value]) => `${name} ${value}`)
              .join(', ')
            return interactive ? (
              <path
                key={shape.index}
                d={path(shape.polygon)}
                fill={fill}
                role="button"
                tabIndex={0}
                aria-pressed={pinned === shape.index}
                aria-label={`Region ${shape.index}: ${summary}`}
                className="glide-path cursor-pointer outline-none focus-visible:stroke-[var(--ring)] focus-visible:[stroke-width:2.5]"
                onPointerEnter={() => setHovered(shape.index)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setFocused(shape.index)}
                onBlur={() => setFocused(null)}
                onClick={() => togglePin(shape.index)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  togglePin(shape.index)
                }}
              />
            ) : (
              <path key={shape.index} d={path(shape.polygon)} fill={fill} className="glide-path" />
            )
          })}
        </g>

        {clipX === null ? null : (
          <g aria-hidden="true">
            <rect x={clipX} y={0} width={f.width - clipX} height={f.height} fill={`url(#${hatch})`} />
            <text x={Math.min(clipX + 6, f.width - 70)} y={14} className="fill-muted text-[11px]">
              not modelled
            </text>
          </g>
        )}

        <path d={path(body)} fill="var(--rule)" stroke="var(--muted)" strokeWidth={1} aria-hidden="true" />

        <g clipPath={`url(#${clip})`} aria-hidden="true">
          {g.shocks.map((s) => (
            <g key={s.index}>
              <line
                x1={f.toX(s.from.x)}
                y1={f.toY(s.from.y)}
                x2={f.toX(s.to.x)}
                y2={f.toY(s.to.y)}
                stroke="var(--down)"
                strokeWidth={selected === s.index ? 3.5 : 2}
                strokeLinecap="round"
              />
              {interactive && onSelectShock !== undefined ? (
                <line
                  x1={f.toX(s.from.x)}
                  y1={f.toY(s.from.y)}
                  x2={f.toX(s.to.x)}
                  y2={f.toY(s.to.y)}
                  stroke="transparent"
                  strokeWidth={14}
                  className="cursor-pointer"
                  onClick={() => onSelectShock(s.index)}
                />
              ) : null}
            </g>
          ))}
        </g>

        {g.regions.map((shape) => {
          const region = chain.regions.find((r) => r.index === shape.index)
          const x = f.toX(shape.label.x)
          if (region === undefined || (clipX !== null && x > clipX)) return null
          const fill = shadeColor(shadeValue(region, property), domain, theme)
          return (
            <text
              key={shape.index}
              x={x}
              y={f.toY(shape.label.y)}
              textAnchor="middle"
              dominantBaseline="central"
              fill={labelInk(fill, theme)}
              className="num pointer-events-none text-[12px] font-semibold"
              aria-hidden="true"
            >
              {shape.index}
            </text>
          )
        })}

        {g.conflict === null ? null : (
          <circle
            cx={f.toX(g.conflict.at.x)}
            cy={f.toY(g.conflict.at.y)}
            r={6}
            fill="none"
            stroke="var(--danger)"
            strokeWidth={2}
            aria-hidden="true"
          />
        )}

        {g.detachedCorner === null ? null : (
          <g aria-hidden="true">
            <path
              d={`M${f.toX(g.detachedCorner.x) - 10},${f.toY(g.detachedCorner.y)} q-12,-28 4,-56`}
              fill="none"
              stroke="var(--down)"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
            <text x={f.toX(g.detachedCorner.x) - 14} y={f.toY(g.detachedCorner.y) - 62} className="fill-down text-[11px]">
              detached
            </text>
          </g>
        )}

        {interactive && onCorner !== undefined
          ? ramps.map((ramp, i) => {
              const c = g.corners[i + 1]
              if (c === undefined) return null
              return (
                <circle
                  key={i}
                  cx={f.toX(c.x)}
                  cy={f.toY(c.y)}
                  r={7}
                  role="slider"
                  tabIndex={0}
                  aria-label={`Ramp ${i + 1} corner`}
                  aria-valuemin={0}
                  aria-valuemax={45}
                  aria-valuenow={ramp.thetaDeg}
                  aria-valuetext={`Ramp ${i + 1}: ${formatValue(ramp.thetaDeg, 4)}°, length ${formatValue(ramp.length, 3)}`}
                  className="glide cursor-grab fill-panel stroke-up outline-none [stroke-width:2] focus-visible:stroke-[var(--ring)] focus-visible:[stroke-width:3]"
                  onPointerDown={(e) => {
                    if (e.button !== 0) return
                    e.currentTarget.setPointerCapture(e.pointerId)
                    setDragging(i)
                  }}
                  onPointerMove={(e) => {
                    if (dragging === i) cornerPointer(e, i)
                  }}
                  onPointerUp={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
                    setDragging(null)
                  }}
                  onPointerCancel={() => setDragging(null)}
                  onKeyDown={(e) => cornerKey(e, i)}
                />
              )
            })
          : null}
      </svg>

      {shownRegion !== undefined && shownShape !== undefined ? (
        <RegionTooltip
          region={shownRegion}
          pinned={pinned === shownRegion.index}
          x={f.toX(shownShape.label.x)}
          y={f.toY(shownShape.label.y)}
          containerWidth={f.width}
        />
      ) : null}
    </div>
  )
}
