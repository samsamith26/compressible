import { useId } from 'react'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cn } from '@/lib/cn'
import { formatValue } from '@/lib/format'
import type { NormalShockState } from '@/physics'

const HEIGHT = 160
const DUCT_TOP = 34
const DUCT_BOTTOM = 134
const ROWS = 5
const UPSTREAM_SPACING = 26

interface ShockTubeProps {
  readonly state: NormalShockState
  readonly stale: boolean
}

function Particles({ from, to, spacing, className }: { from: number; to: number; spacing: number; className: string }) {
  const count = Math.ceil((to - from) / spacing) + 2
  const rowGap = (DUCT_BOTTOM - DUCT_TOP) / (ROWS + 1)
  return (
    <g className="drift" style={{ '--spacing': `${spacing}px` }}>
      {Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: count }, (_, i) => (
          <circle
            key={`${r}-${i}`}
            cx={from - spacing + i * spacing + (r % 2) * (spacing / 2)}
            cy={DUCT_TOP + rowGap * (r + 1)}
            r={2.2}
            className={className}
          />
        )),
      )}
    </g>
  )
}

/**
 * A duct with a standing normal shock. Particles drift at each side's velocity with a shared
 * period, so their spacing is ∝ 1/ρ: the compression ρ₂/ρ₁ is visible as crowding.
 */
export function ShockTube({ state, stale }: ShockTubeProps) {
  const clipUp = useId()
  const clipDown = useId()
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const shockX = Math.round(width * 0.46)
  const downSpacing = UPSTREAM_SPACING / state.rho2Rho1
  // Leave room after each arrow for its Mach label.
  const arrowUp = Math.min(shockX * 0.4, 90)
  const arrowDown = arrowUp / state.rho2Rho1

  return (
    <div ref={ref} className={cn('transition-opacity', stale && 'opacity-45')}>
      <svg width={width} height={HEIGHT} role="img" aria-label={`Normal shock: M₁ ${formatValue(state.m1, 4)} upstream, M₂ ${formatValue(state.m2, 4)} downstream; density rises by ${formatValue(state.rho2Rho1, 4)} times`}>
        <defs>
          <clipPath id={clipUp}>
            <rect x={0} y={DUCT_TOP} width={shockX} height={DUCT_BOTTOM - DUCT_TOP} />
          </clipPath>
          <clipPath id={clipDown}>
            <rect x={shockX} y={DUCT_TOP} width={width - shockX} height={DUCT_BOTTOM - DUCT_TOP} />
          </clipPath>
          <marker id={`${clipUp}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" className="fill-ink" />
          </marker>
        </defs>
        <rect x={0} y={DUCT_TOP} width={shockX} height={DUCT_BOTTOM - DUCT_TOP} className="fill-up/8" />
        <rect x={shockX} y={DUCT_TOP} width={width - shockX} height={DUCT_BOTTOM - DUCT_TOP} className="fill-down/10" />
        <g clipPath={`url(#${clipUp})`} aria-hidden="true">
          <Particles from={0} to={shockX} spacing={UPSTREAM_SPACING} className="fill-up" />
        </g>
        <g clipPath={`url(#${clipDown})`} aria-hidden="true">
          <Particles from={shockX} to={width} spacing={downSpacing} className="fill-down" />
        </g>
        <line x1={0} x2={width} y1={DUCT_TOP} y2={DUCT_TOP} className="stroke-ink" strokeWidth={1.5} />
        <line x1={0} x2={width} y1={DUCT_BOTTOM} y2={DUCT_BOTTOM} className="stroke-ink" strokeWidth={1.5} />
        <line x1={shockX} x2={shockX} y1={DUCT_TOP - 6} y2={DUCT_BOTTOM + 6} className="stroke-ink" strokeWidth={3} />

        <g aria-hidden="true" className="text-[12px]">
          <text x={12} y={22} className="fill-up font-medium">
            ① upstream
          </text>
          <text x={width - 12} y={22} textAnchor="end" className="fill-down font-medium">
            ② downstream
          </text>
          <text x={shockX} y={DUCT_TOP - 10} textAnchor="middle" className="fill-muted text-[11px]">
            shock
          </text>
          <line x1={12} x2={12 + arrowUp} y1={DUCT_BOTTOM + 14} y2={DUCT_BOTTOM + 14} className="stroke-ink" strokeWidth={1.5} markerEnd={`url(#${clipUp}-arrow)`} />
          <line x1={shockX + 12} x2={shockX + 12 + arrowDown} y1={DUCT_BOTTOM + 14} y2={DUCT_BOTTOM + 14} className="stroke-ink" strokeWidth={1.5} markerEnd={`url(#${clipUp}-arrow)`} />
          <text x={20 + arrowUp} y={DUCT_BOTTOM + 14} dy="0.32em" className="num fill-ink">
            M₁ {formatValue(state.m1, 4)}
          </text>
          <text x={shockX + 20 + arrowDown} y={DUCT_BOTTOM + 14} dy="0.32em" className="num fill-ink">
            M₂ {formatValue(state.m2, 4)}
          </text>
        </g>
      </svg>
    </div>
  )
}
