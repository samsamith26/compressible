import { useId, useState, type ReactNode } from 'react'
import { useDocumentTheme } from '@/hooks/useDocumentTheme'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cn } from '@/lib/cn'
import { fieldFrame, type Frame } from './frame'
import { regionRows } from './labels'
import { RegionTooltip } from './RegionTooltip'
import { labelInk, shadeColor, shadeValue } from './shade'
import type { Chain, Pt, RegionShape, ShadeProperty } from './types'

export interface FieldShock {
  /** 1-based shock index. */
  readonly index: number
  readonly from: Pt
  readonly to: Pt
  /** Optional angle label drawn near the shock's start, e.g. "29.3° to cowl". */
  readonly label?: string
}

/** Where the chain stopped, with a short label (the full explanation is a notice outside the drawing). */
export interface FieldStop {
  readonly at: Pt
  readonly text: string
}

interface InletFieldProps {
  readonly label: string
  readonly bounds: { readonly x0: number; readonly x1: number; readonly y1: number }
  /** Lower wall polyline from the lead-in to the end; the solid is filled below it. */
  readonly lowerWall: readonly Pt[]
  /** Upper wall (cowl) polyline; the solid is filled above it to the top. */
  readonly upperWall?: readonly Pt[]
  readonly regions: readonly RegionShape[]
  readonly chain: Chain
  readonly shocks: readonly FieldShock[]
  /** Clip the drawing at this x (a conflict the model can't represent); hatched beyond. */
  readonly clipX: number | null
  readonly conflictAt: Pt | null
  readonly stop: FieldStop | null
  readonly property: ShadeProperty
  readonly domain: readonly [number, number]
  /** Highlighted shock, 1-based; null for none. */
  readonly selected: number | null
  /** Read-only drawings omit region buttons and shock selection. */
  readonly interactive: boolean
  readonly onSelectShock?: (shock: number) => void
  readonly maxHeight?: number
  readonly stale?: boolean
  /** Fixed bounds while a handle is dragged, so the drawing doesn't rescale under the pointer. */
  readonly frozenBounds?: { readonly x0: number; readonly x1: number; readonly y1: number } | null
  /** Mode-specific controls drawn on top, in the drawing's pixel frame. */
  readonly handles?: ((frame: Frame) => ReactNode) | undefined
  readonly dragging?: boolean
}

/**
 * An inlet drawing shared by both modes: walls, the regions between shocks shaded by a chosen
 * property, the shocks, and where the chain stopped. Regions are focusable buttons with a tooltip
 * (click or Enter pins it). Each mode adds its own handles.
 */
export function InletField({
  label,
  bounds,
  lowerWall,
  upperWall,
  regions,
  chain,
  shocks,
  clipX: clipModelX,
  conflictAt,
  stop,
  property,
  domain,
  selected,
  interactive,
  onSelectShock,
  maxHeight = 340,
  stale = false,
  frozenBounds = null,
  handles,
  dragging = false,
}: InletFieldProps) {
  const id = useId()
  const theme = useDocumentTheme()
  const [ref, available] = useElementWidth<HTMLDivElement>()
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
  const f = fieldFrame(frozenBounds ?? bounds, available, maxHeight)

  const P = (p: Pt) => `${f.toX(p.x).toFixed(1)},${f.toY(p.y).toFixed(1)}`
  const path = (pts: readonly Pt[]) => `M${pts.map(P).join('L')}Z`
  const clipX = clipModelX === null ? null : f.toX(clipModelX)
  const clip = `${id}-clip`
  const hatch = `${id}-hatch`
  const shown = hovered ?? focused ?? pinned
  const shownRegion = chain.regions.find((r) => r.index === shown)
  const shownShape = regions.find((r) => r.index === shown)
  const floor = f.toModel(0, f.floorY).y
  const top = f.toModel(0, 0).y
  const first = lowerWall[0]
  const last = lowerWall[lowerWall.length - 1]
  const lowerBody =
    first === undefined || last === undefined
      ? []
      : [...lowerWall, { x: last.x, y: floor }, { x: first.x, y: floor }]
  const cowlFirst = upperWall?.[0]
  const cowlLast = upperWall?.[upperWall.length - 1]
  const upperBody =
    upperWall === undefined || cowlFirst === undefined || cowlLast === undefined
      ? null
      : [...upperWall, { x: cowlLast.x, y: top }, { x: cowlFirst.x, y: top }]

  function togglePin(index: number) {
    setPinned((p) => (p === index ? null : index))
  }

  return (
    <div ref={ref} className={cn('relative min-w-0 transition-opacity', stale && 'opacity-45')}>
      <svg
        role="group"
        aria-label={label}
        width={f.width}
        height={f.height}
        viewBox={`0 0 ${f.width} ${f.height}`}
        className={cn('block max-w-full touch-none select-none', dragging && 'dragging')}
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
          {regions.map((shape) => {
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

        {lowerBody.length === 0 ? null : (
          <path d={path(lowerBody)} fill="var(--rule)" stroke="var(--muted)" strokeWidth={1} aria-hidden="true" />
        )}
        {upperBody === null ? null : (
          <path d={path(upperBody)} fill="var(--rule)" stroke="var(--muted)" strokeWidth={1} aria-hidden="true" />
        )}

        <g clipPath={`url(#${clip})`} aria-hidden="true">
          {shocks.map((s) => (
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
              {s.label === undefined ? null : (
                <text
                  x={f.toX(s.from.x + (s.to.x - s.from.x) * 0.5) + 6}
                  y={f.toY(s.from.y + (s.to.y - s.from.y) * 0.5)}
                  className="num fill-ink text-[10px]"
                  stroke="var(--panel)"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {s.label}
                </text>
              )}
            </g>
          ))}
        </g>

        {regions.map((shape) => {
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

        {conflictAt === null ? null : (
          <circle cx={f.toX(conflictAt.x)} cy={f.toY(conflictAt.y)} r={6} fill="none" stroke="var(--danger)" strokeWidth={2} aria-hidden="true" />
        )}

        {stop === null ? null : (
          <g aria-hidden="true">
            <path
              d={`M${f.toX(stop.at.x) - 10},${f.toY(stop.at.y)} q-12,-28 4,-56`}
              fill="none"
              stroke="var(--down)"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
            <text
              x={Math.min(Math.max(f.toX(stop.at.x) - 14, 2), f.width - 96)}
              y={Math.max(f.toY(stop.at.y) - 62, 12)}
              className="fill-down text-[11px]"
            >
              {stop.text}
            </text>
          </g>
        )}

        {handles?.(f)}
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
