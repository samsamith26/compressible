import { useMemo } from 'react'
import type { IsentropicState } from '@/physics'
import { MachChart, type MachSeries } from './MachChart'
import { machAxisMax, ratioCurves, type RatioPoint } from './model'

const STAGNATION: readonly MachSeries[] = [
  { key: 'p', label: 'p/p_0', color: 'var(--c-p)', y: (p) => p.pP0 },
  { key: 'rho', label: 'ρ/ρ_0', color: 'var(--c-rho)', y: (p) => p.rhoRho0 },
  { key: 't', label: 'T/T_0', color: 'var(--c-t)', y: (p) => p.tT0 },
]
const AREA: readonly MachSeries[] = [{ key: 'a', label: 'A/A*', color: 'var(--s1)', y: (p) => p.aAStar }]

/** Small multiples: stagnation ratios (linear) and area ratio (log), sharing the M axis. */
export function RatioCharts({ state, gamma, onSetMach }: { state: IsentropicState; gamma: number; onSetMach: (m: number) => void }) {
  const xMax = machAxisMax(state.mach)
  const points = useMemo(() => ratioCurves(gamma, xMax), [gamma, xMax])
  const current: RatioPoint = { mach: state.mach, pP0: state.pP0, rhoRho0: state.rhoRho0, tT0: state.tT0, aAStar: state.aAStar }
  const aMax = Math.max(10, ...points.map((p) => p.aAStar))

  return (
    <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
      <MachChart
        title="Stagnation ratios"
        summary={`p/p0, ρ/ρ0 and T/T0 against Mach number from 0 to ${xMax}; the marker is at M = ${state.mach.toPrecision(4)}. Drag or use the arrow keys to change M.`}
        points={points}
        xMax={xMax}
        series={STAGNATION}
        yScale="linear"
        yDomain={[0, 1]}
        current={current}
        onSetMach={onSetMach}
        labelAtMach={1.5}
      />
      <MachChart
        title="Area ratio"
        summary={`A/A* against Mach number on a log scale; minimum 1 at M = 1. The marker is at M = ${state.mach.toPrecision(4)}.`}
        points={points}
        xMax={xMax}
        series={AREA}
        yScale="log"
        yDomain={[1, aMax]}
        current={current}
        onSetMach={onSetMach}
      />
    </div>
  )
}
