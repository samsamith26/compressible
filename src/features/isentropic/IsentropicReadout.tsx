import { StationTable } from '@/components/StationTable'
import { formatValue } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { IsentropicState } from '@/physics'

/** Headline Mach number with the angles and area ratio, then the p, ρ, T ratio table. */
export function IsentropicReadout({ state, stale }: { state: IsentropicState; stale: boolean }) {
  const figures = [
    { key: 'a', label: 'A/A*', value: state.aAStar, unit: '' },
    { key: 'mu', label: 'Mach angle μ', value: state.machAngleDeg, unit: '°' },
    { key: 'nu', label: 'Prandtl–Meyer angle ν', value: state.prandtlMeyerDeg, unit: '°' },
  ]
  return (
    <div className={cn('flex min-w-0 flex-col gap-6 transition-opacity', stale && 'opacity-45')}>
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <div className="text-sm text-ink-2">Mach number</div>
          <div data-testid="mach-headline" className="num text-2xl leading-tight font-bold text-ink">
            {formatValue(state.mach)}
          </div>
          <div className="text-sm text-ink-2">{state.mach < 1 ? 'Subsonic' : state.mach === 1 ? 'Sonic' : 'Supersonic'}</div>
        </div>
        <dl className="m-0 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
          {figures.map((f) => (
            <div key={f.key} className="contents">
              <dt className="text-sm text-ink-2">{f.label}</dt>
              <dd className="num m-0 text-right text-ink">{f.value === null ? '— (needs M ≥ 1)' : `${formatValue(f.value)}${f.unit}`}</dd>
            </div>
          ))}
        </dl>
      </div>
      <StationTable
        caption="Static-to-reference ratios"
        stale={stale}
        columns={[
          { key: 'stag', label: 'to stagnation (…₀)', emphasis: true },
          { key: 'sonic', label: 'to sonic (…*)' },
        ]}
        rows={[
          { key: 'p', label: 'p', values: [state.pP0, state.pPStar] },
          { key: 'rho', label: 'ρ', values: [state.rhoRho0, state.rhoRhoStar] },
          { key: 't', label: 'T', values: [state.tT0, state.tTStar] },
        ]}
      />
    </div>
  )
}
