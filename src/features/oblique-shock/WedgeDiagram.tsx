import { useId } from 'react'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cn } from '@/lib/cn'
import { formatValue } from '@/lib/format'
import { wedgeGeometry } from './wedgeGeometry'

interface WedgeDiagramProps {
  readonly thetaDeg: number
  /** Null when detached. */
  readonly betaDeg: number | null
  readonly m1: number
  readonly stale: boolean
  readonly dragging: boolean
}

/** Supersonic flow over a ramp of angle θ: the shock at β, or a detached bow shock. */
export function WedgeDiagram({ thetaDeg, betaDeg, m1, stale, dragging }: WedgeDiagramProps) {
  const clipId = useId()
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const height = Math.round(Math.min(300, Math.max(200, width * 0.48)))
  const g = wedgeGeometry({ width, height, thetaDeg, betaDeg, m1 })
  const attached = betaDeg !== null
  const label = attached
    ? `Attached oblique shock at β ${formatValue(betaDeg, 4)}° on a ${formatValue(thetaDeg, 4)}° ramp`
    : `Detached bow shock ahead of a ${formatValue(thetaDeg, 4)}° ramp`
  const midAngle = (a: number, r: number): { x: number; y: number } => ({
    x: g.apex.x + r * Math.cos((a * Math.PI) / 360),
    y: g.apex.y - r * Math.sin((a * Math.PI) / 360),
  })
  const thetaLabel = midAngle(thetaDeg, 58)
  const betaLabel = attached ? midAngle(betaDeg, 92) : null

  return (
    <div ref={ref} className={cn('transition-opacity', stale && 'opacity-45', dragging && 'dragging')}>
      <svg width={width} height={height} role="img" aria-label={label}>
        <title>{label}</title>
        <defs>
          <clipPath id={clipId}>
            <rect width={width} height={height} />
          </clipPath>
          <pattern id={`${clipId}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line y2="7" className="stroke-ink/25" strokeWidth="1.2" />
          </pattern>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {g.region2Path === null ? null : <path d={g.region2Path} className="fill-down/8" aria-hidden="true" />}
          {g.streamlinePaths.map((d, i) => (
            <path key={i} d={d} className="glide-path fill-none stroke-up/70" strokeWidth={1.2} aria-hidden="true" />
          ))}
          {attached ? (
            <g className="glide" style={{ transform: `translate(${g.apex.x}px, ${g.apex.y}px) rotate(${-betaDeg}deg)` }} aria-hidden="true">
              <line x2={width * 2} className="stroke-down" strokeWidth={3} strokeLinecap="round" />
            </g>
          ) : (
            <path d={g.bowShockPath ?? ''} className="fill-none stroke-down" strokeWidth={3} strokeDasharray="10 5" aria-hidden="true" />
          )}
          <path d={g.bodyPath} fill={`url(#${clipId}-hatch)`} className="stroke-none" aria-hidden="true" />
          <path d={g.surfacePath} className="fill-none stroke-ink" strokeWidth={2} aria-hidden="true" />

          <g aria-hidden="true" className="text-[12px]">
            <path d={g.arc(48, thetaDeg)} className="fill-none stroke-ink/60" />
            <line x1={g.apex.x} x2={g.apex.x + 70} y1={g.apex.y} y2={g.apex.y} className="stroke-ink/40" strokeDasharray="3 3" />
            <text x={thetaLabel.x + 6} y={thetaLabel.y} dy="0.32em" className="num fill-ink">
              θ {formatValue(thetaDeg, 3)}°
            </text>
            {betaLabel === null ? null : (
              <>
                <path d={g.arc(84, betaDeg ?? 0)} className="fill-none stroke-down/70" />
                <text x={betaLabel.x + 8} y={betaLabel.y} dy="0.32em" className="num fill-down">
                  β {formatValue(betaDeg, 3)}°
                </text>
              </>
            )}
            <text x={12} y={20} className="fill-up font-medium">
              M₁ {formatValue(m1, 4)} →
            </text>
            {attached ? null : (
              <text x={12} y={38} className="fill-down font-medium">
                detached bow shock (schematic)
              </text>
            )}
          </g>
        </g>
      </svg>
    </div>
  )
}
