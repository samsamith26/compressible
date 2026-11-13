import { CalculatorLayout } from '@/components/CalculatorLayout'
import { JumpChart } from '@/components/charts/JumpChart'
import { GammaField } from '@/components/GammaField'
import { KindSelect } from '@/components/KindSelect'
import { NumberField } from '@/components/NumberField'
import { Panel } from '@/components/Panel'
import { Readout } from '@/components/Readout'
import { messageFor } from '@/lib/fields'
import { NORMAL_SHOCK_KINDS, NORMAL_SHOCK_OUTPUTS, NORMAL_SHOCK_QUANTITIES } from './model'
import { ShockTube } from './ShockTube'
import { useNormalShockSolver } from './useNormalShockSolver'

export function NormalShockCalculator() {
  const s = useNormalShockSolver()
  const stale = s.error !== null
  const { state } = s

  return (
    <CalculatorLayout
      inputs={
        <>
          <KindSelect label="Known quantity" kinds={NORMAL_SHOCK_KINDS} quantities={NORMAL_SHOCK_QUANTITIES} value={s.kind} onChange={s.setKind} />
          <NumberField quantity={NORMAL_SHOCK_QUANTITIES[s.kind]} value={s.valueText} onChange={s.setValueText} error={messageFor(s.error, 'value')} tone="up" hint="↑/↓ to step, Shift for ×10" />
          <GammaField value={s.gamma.text} onChange={s.gamma.setText} error={messageFor(s.error, 'gamma')} />
        </>
      }
      intro={
        <p>
          A stationary normal shock in a calorically perfect gas. Subscript 1 is upstream, 2 downstream; p₁/p₀₂ is
          what a pitot tube reads in supersonic flow.
        </p>
      }
    >
      <Panel title="Across the shock">
        <Readout
          stale={stale}
          rows={NORMAL_SHOCK_OUTPUTS.map((key) => ({
            key,
            quantity: NORMAL_SHOCK_QUANTITIES[key],
            value: state[key],
            isInput: key === s.kind,
          }))}
        />
      </Panel>
      <Panel title="Shock in a duct" caption="particle spacing ∝ 1/ρ · arrow length ∝ velocity">
        <div className="graph-paper px-4 py-3">
          <ShockTube state={state} stale={stale} />
        </div>
      </Panel>
      <Panel title="Jump across the shock" caption="state 2 ÷ state 1 · log scale">
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
      </Panel>
    </CalculatorLayout>
  )
}
