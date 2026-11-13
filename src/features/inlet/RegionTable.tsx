import { cn } from '@/lib/cn'
import { formatValue } from '@/lib/format'
import type { Region } from './model'

const COLUMNS: readonly { key: string; label: string; title: string; value: (r: Region) => number | null }[] = [
  { key: 'M', label: 'M', title: 'Mach number', value: (r) => r.mach },
  { key: 'beta', label: 'β (°)', title: 'wave angle of the shock that formed the region', value: (r) => r.betaDeg },
  { key: 'theta', label: 'θ (°)', title: 'this ramp’s turning angle', value: (r) => (r.index === 1 ? null : r.thetaLocalDeg) },
  { key: 'wall', label: 'wall (°)', title: 'cumulative wall angle', value: (r) => r.thetaCumDeg },
  { key: 'p', label: 'p/p₁', title: 'static pressure ratio', value: (r) => r.pP1 },
  { key: 'rho', label: 'ρ/ρ₁', title: 'density ratio', value: (r) => r.rhoRho1 },
  { key: 'T', label: 'T/T₁', title: 'temperature ratio', value: (r) => r.tT1 },
  { key: 'p0', label: 'p₀/p₀₁', title: 'stagnation pressure recovery', value: (r) => r.p0P01 },
]

interface RegionTableProps {
  readonly regions: readonly Region[]
  /** Region to highlight (behind the selected shock), 1-based. */
  readonly highlight: number | null
  readonly stale: boolean
}

/** One row per region: the state between consecutive shocks, ratios relative to the freestream. */
export function RegionTable({ regions, highlight, stale }: RegionTableProps) {
  return (
    <div className={cn('overflow-x-auto transition-opacity', stale && 'opacity-45')}>
      <table aria-label="Regions" className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule text-left text-xs text-muted">
            <th scope="col" className="px-4 py-2 font-medium">
              Region
            </th>
            {COLUMNS.map((c) => (
              <th key={c.key} scope="col" title={c.title} className="px-2 py-2 text-right font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {regions.map((r) => (
            <tr
              key={r.index}
              aria-current={highlight === r.index ? 'true' : undefined}
              className={cn('border-b border-rule/60 last:border-0', highlight === r.index && 'bg-up/8')}
            >
              <th scope="row" className="num px-4 py-1.5 text-left font-medium">
                {r.index}
              </th>
              {COLUMNS.map((c) => (
                <td key={c.key} className="num px-2 py-1.5 text-right">
                  {(() => {
                    const v = c.value(r)
                    return v === null ? '—' : formatValue(v)
                  })()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
