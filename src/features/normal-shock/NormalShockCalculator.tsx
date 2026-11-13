import { JumpChart } from '@/components/charts/JumpChart'
import { KindSelect } from '@/components/KindSelect'
import { MachPair } from '@/components/MachPair'
import { NumberInput } from '@/components/NumberInput'
import { ProblemLine } from '@/components/ProblemLine'
import { StationTable } from '@/components/StationTable'
import type { CalcParams } from '@/lib/urlState'
import { DuctView } from './DuctView'
import { jumpRows, NORMAL_KINDS, normalKindInfo } from './model'
import { useNormalShock } from './useNormalShock'

export function NormalShockCalculator({
  initial,
  onParamsChange,
}: {
  initial: CalcParams
  onParamsChange: (p: CalcParams) => void
}) {
  const s = useNormalShock(initial, onParamsChange)
  const st = s.state

  return (
    <div className="flex flex-col gap-10">
      <ProblemLine>
        <NumberInput id="ns-gamma" label="γ" text={s.gamma} onTextChange={s.setGamma} error={s.gammaError} width="w-20" />
        <KindSelect id="ns-kind" options={NORMAL_KINDS} value={s.kind} onChange={s.setKind} />
        <NumberInput id="ns-value" label={normalKindInfo(s.kind).label} text={s.value} onTextChange={s.setValue} error={s.valueError} />
      </ProblemLine>
      <div className="grid items-start gap-x-12 gap-y-8 lg:grid-cols-[minmax(240px,340px)_1fr]">
        <DuctView state={st} />
        <div className="flex min-w-0 flex-col gap-8">
          <MachPair m1={st.m1} m2={st.m2} stale={s.stale} />
          <StationTable
            caption="Across the shock"
            stale={s.stale}
            columns={[{ key: 'ratio', label: 'downstream ÷ upstream', emphasis: true }]}
            rows={[
              { key: 'p', label: 'p_2/p_1', values: [st.p2P1] },
              { key: 'rho', label: 'ρ_2/ρ_1', values: [st.rho2Rho1] },
              { key: 't', label: 'T_2/T_1', values: [st.t2T1] },
              { key: 'p0', label: 'p_{02}/p_{01}', values: [st.p02P01] },
              { key: 'pitot', label: 'p_1/p_{02}', values: [st.p1P02] },
            ]}
          />
        </div>
      </div>
      <div className="max-w-3xl">
        <JumpChart rows={jumpRows(st)} stale={s.stale} />
      </div>
    </div>
  )
}
