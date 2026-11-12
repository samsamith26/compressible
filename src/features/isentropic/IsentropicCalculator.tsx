import { CalculatorLayout } from '@/components/CalculatorLayout'
import { GammaField } from '@/components/GammaField'
import { KindSelect } from '@/components/KindSelect'
import { NumberField } from '@/components/NumberField'
import { Panel } from '@/components/Panel'
import { Readout } from '@/components/Readout'
import { messageFor } from '@/lib/fields'
import { ISENTROPIC_INPUTS, ISENTROPIC_KINDS, ISENTROPIC_OUTPUTS } from './model'
import { RatioChart } from './RatioChart'
import { useIsentropicSolver } from './useIsentropicSolver'

const INPUT_OUTPUT: Readonly<Record<string, string>> = { areaSub: 'aAStar', areaSup: 'aAStar' }

export function IsentropicCalculator() {
  const s = useIsentropicSolver()
  const inputKey = INPUT_OUTPUT[s.kind] ?? s.kind

  return (
    <CalculatorLayout
      inputs={
        <>
          <KindSelect label="Known quantity" kinds={ISENTROPIC_KINDS} quantities={ISENTROPIC_INPUTS} value={s.kind} onChange={s.setKind} />
          <NumberField quantity={ISENTROPIC_INPUTS[s.kind]} value={s.valueText} onChange={s.setValueText} error={messageFor(s.error, 'value')} tone="up" hint="↑/↓ to step, Shift for ×10" />
          <GammaField value={s.gamma.text} onChange={s.gamma.setText} error={messageFor(s.error, 'gamma')} />
        </>
      }
      intro={
        <p>
          Adiabatic, reversible flow of a calorically perfect gas. Ratios are static to stagnation (₀) and to sonic
          conditions (*). Drag the chart to sweep the Mach number.
        </p>
      }
    >
      <Panel title="Flow state">
        <Readout
          stale={s.error !== null}
          rows={ISENTROPIC_OUTPUTS.map(([key, quantity]) => ({
            key,
            quantity,
            value: s.state[key],
            isInput: key === inputKey,
          }))}
        />
      </Panel>
      <Panel title="Ratios vs Mach number" caption="log scale · drag or use ←/→ on the marker">
        <div className="graph-paper px-1 pb-2 pt-2 sm:px-3">
          <RatioChart state={s.state} gamma={s.gamma.value} onMach={s.setMach} stale={s.error !== null} />
        </div>
      </Panel>
    </CalculatorLayout>
  )
}
