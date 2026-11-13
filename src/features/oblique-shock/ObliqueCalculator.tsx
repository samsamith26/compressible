import { jumpRows } from '@/components/charts/jump'
import { JumpChart } from '@/components/charts/JumpChart'
import { KindSelect } from '@/components/KindSelect'
import { MachPair } from '@/components/MachPair'
import { NumberInput } from '@/components/NumberInput'
import { ProblemLine } from '@/components/ProblemLine'
import { StationTable } from '@/components/StationTable'
import type { CalcParams } from '@/lib/urlState'
import type { ObliqueShockState } from '@/physics'
import { DetachedNote } from './DetachedNote'
import { OBLIQUE_KINDS, obliqueKindInfo, selectedState, type ObliqueView } from './model'
import { ThetaBetaChart } from './ThetaBetaChart'
import { useOblique } from './useOblique'
import { WedgeView } from './WedgeView'

const ROWS: readonly { key: keyof ObliqueShockState; label: string; upstream?: true }[] = [
  { key: 'm2', label: 'M', upstream: true },
  { key: 'betaDeg', label: 'β (°)' },
  { key: 'thetaDeg', label: 'θ (°)' },
  { key: 'm1n', label: 'M_{1n}' },
  { key: 'm2n', label: 'M_{2n}' },
  { key: 'p2P1', label: 'p_2/p_1' },
  { key: 'rho2Rho1', label: 'ρ_2/ρ_1' },
  { key: 't2T1', label: 'T_2/T_1' },
  { key: 'p02P01', label: 'p_{02}/p_{01}' },
]

function solutionRows(view: ObliqueView) {
  const weak = view.kind === 'attached' ? view.weak : null
  const strong = view.kind === 'attached' ? view.strong : null
  return ROWS.map((r) => ({
    key: r.key,
    label: r.label,
    values: [r.upstream === true ? view.m1 : null, weak === null ? null : weak[r.key], strong === null ? null : strong[r.key]],
  }))
}

export function ObliqueCalculator({
  initial,
  onParamsChange,
}: {
  initial: CalcParams
  onParamsChange: (p: CalcParams) => void
}) {
  const s = useOblique(initial, onParamsChange)
  const { view } = s
  const sel = view.kind === 'attached' ? selectedState(view) : null
  const info = obliqueKindInfo(s.kind)

  return (
    <div className="flex flex-col gap-10">
      <ProblemLine>
        <NumberInput id="ob-gamma" label="γ" text={s.gamma} onTextChange={s.setGamma} error={s.gammaError} width="w-20" />
        <NumberInput id="ob-m1" label="M_1" text={s.m1} onTextChange={s.setM1} error={s.m1Error} width="w-20" />
        <KindSelect id="ob-kind" options={OBLIQUE_KINDS} value={s.kind} onChange={s.setKind} />
        <NumberInput id="ob-value" label={info.label} text={s.value} onTextChange={s.setValue} error={s.valueError} {...(info.unit ? { unit: info.unit } : {})} />
      </ProblemLine>

      {view.kind === 'detached' && !s.stale && <DetachedNote thetaDeg={view.thetaDeg} thetaMaxDeg={view.max.thetaMaxDeg} m1={view.m1} />}

      <div className="grid items-start gap-x-12 gap-y-8 lg:grid-cols-[minmax(240px,340px)_1fr]">
        <WedgeView view={view} />
        <div className="flex min-w-0 flex-col gap-8">
          <MachPair
            m1={view.m1}
            m2={sel?.m2 ?? Number.NaN}
            stale={s.stale}
            {...(view.kind === 'attached' ? { note: view.selected } : {})}
          />
          <StationTable
            caption="Upstream, weak and strong solutions"
            stale={s.stale}
            columns={[
              { key: 'up', label: 'Upstream', tone: 's1' },
              { key: 'weak', label: view.kind === 'attached' && view.selected === 'weak' ? 'Weak (selected)' : 'Weak', tone: 's2', emphasis: view.kind === 'attached' && view.selected === 'weak' },
              { key: 'strong', label: view.kind === 'attached' && view.selected === 'strong' ? 'Strong (selected)' : 'Strong', tone: 's2', emphasis: view.kind === 'attached' && view.selected === 'strong' },
            ]}
            rows={solutionRows(view)}
          />
          <p className="m-0 max-w-xl text-sm text-ink-2">
            θ<sub>max</sub> = {view.max.thetaMaxDeg.toFixed(2)}° at β = {view.max.betaDeg.toFixed(2)}° for this M<sub>1</sub>.
            Below it each θ has two solutions; the weak one is what a ramp or wedge normally produces.
          </p>
        </div>
      </div>

      <div className="grid items-start gap-x-10 gap-y-10 xl:grid-cols-[3fr_2fr]">
        <ThetaBetaChart view={view} gamma={s.gammaValue} onSetBeta={s.setBeta} stale={s.stale} />
        {sel !== null && <JumpChart rows={jumpRows(sel)} stale={s.stale} />}
      </div>
    </div>
  )
}
