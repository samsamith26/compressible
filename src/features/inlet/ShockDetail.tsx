import type { KeyboardEvent } from 'react'
import { JumpChart } from '@/components/charts/JumpChart'
import { Panel } from '@/components/Panel'
import { DetachedNotice } from '@/features/oblique-shock/DetachedNotice'
import { ThetaBetaChart } from '@/features/oblique-shock/ThetaBetaChart'
import { WedgeDiagram } from '@/features/oblique-shock/WedgeDiagram'
import { usePointerDrag } from '@/hooks/usePointerDrag'
import { cn } from '@/lib/cn'
import { formatValue } from '@/lib/format'
import { plain } from './labels'
import type { ShockLink } from './model'

interface ShockDetailProps {
  readonly shocks: readonly ShockLink[]
  /** Selected shock, 1-based. */
  readonly selected: number
  readonly gamma: number
  readonly stale: boolean
  readonly onSelect: (shock: number) => void
  /** A β picked on the θ-β-M chart for shock `index0`. */
  readonly onBeta: (index0: number, betaDeg: number) => void
}

/** Picks one shock of the chain and shows it with the oblique-shock views, as a standalone shock. */
export function ShockDetail({ shocks, selected, gamma, stale, onSelect, onBeta }: ShockDetailProps) {
  const drag = usePointerDrag()
  const shock = shocks[selected - 1] ?? shocks[0]
  if (shock === undefined) return null
  const state = shock.kind === 'attached' ? shock.state : null

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (step === 0) return
    e.preventDefault()
    const next = ((shock.index - 1 + step + shocks.length) % shocks.length) + 1
    onSelect(next)
    e.currentTarget.parentElement?.querySelectorAll('button')[next - 1]?.focus()
  }

  return (
    <Panel
      title={`Shock ${shock.index} detail`}
      caption={
        <div role="radiogroup" aria-label="Selected shock" className="flex gap-1">
          {shocks.map((s) => (
            <button
              key={s.index}
              type="button"
              role="radio"
              aria-checked={s.index === shock.index}
              aria-label={`Shock ${s.index}`}
              tabIndex={s.index === shock.index ? 0 : -1}
              onClick={() => onSelect(s.index)}
              onKeyDown={onKeyDown}
              className={cn(
                'num rounded px-2 py-0.5 text-xs transition-colors',
                s.index === shock.index ? 'bg-ink text-paper' : 'text-muted hover:bg-ink/8',
              )}
            >
              {s.index}
            </button>
          ))}
        </div>
      }
    >
      <p className="border-b border-rule px-4 py-2.5 text-sm text-ink">
        Shock {shock.index} on its own: upstream M₁ = <span className="num">{formatValue(shock.upstreamMach, 4)}</span>, ramp θ ={' '}
        <span className="num">{plain(shock.thetaDeg)}°</span>
        {state === null ? null : (
          <>
            , β = <span className="num">{formatValue(state.betaDeg, 4)}°</span>
          </>
        )}
        .
      </p>
      {shock.kind === 'detached' ? (
        <div className="p-3">
          <DetachedNotice thetaDeg={shock.thetaDeg} m1={shock.upstreamMach} max={shock.max} />
        </div>
      ) : null}
      <div className="grid gap-3 p-3 2xl:grid-cols-2">
        <div className="graph-paper rounded-md px-4 py-3">
          <WedgeDiagram
            thetaDeg={shock.thetaDeg}
            betaDeg={state?.betaDeg ?? null}
            m1={shock.upstreamMach}
            stale={stale}
            dragging={drag.dragging}
          />
        </div>
        <div className="graph-paper rounded-md px-1 py-2 sm:px-3">
          <ThetaBetaChart
            m1={shock.upstreamMach}
            gamma={gamma}
            max={shock.max}
            point={state === null ? null : { thetaDeg: state.thetaDeg, betaDeg: state.betaDeg }}
            detachedThetaDeg={state === null ? shock.thetaDeg : null}
            onBeta={(beta) => onBeta(shock.index - 1, beta)}
            drag={drag}
            stale={stale}
          />
        </div>
      </div>
      {state === null ? null : (
        <div className="border-t border-rule">
          <JumpChart
            stale={stale}
            jumps={[
              { key: 'p', label: 'p₂/p₁', ratio: state.p2P1 },
              { key: 'rho', label: 'ρ₂/ρ₁', ratio: state.rho2Rho1 },
              { key: 'T', label: 'T₂/T₁', ratio: state.t2T1 },
              { key: 'p0', label: 'p₀₂/p₀₁', ratio: state.p02P01 },
              { key: 'M', label: 'M₂/M₁', ratio: state.m2 / state.m1 },
            ]}
          />
        </div>
      )}
    </Panel>
  )
}
