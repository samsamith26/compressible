import { CalculatorLayout } from '@/components/CalculatorLayout'
import { JumpChart } from '@/components/charts/JumpChart'
import { GammaField } from '@/components/GammaField'
import { KindSelect } from '@/components/KindSelect'
import { NumberField } from '@/components/NumberField'
import { Panel } from '@/components/Panel'
import { Readout } from '@/components/Readout'
import { usePointerDrag } from '@/hooks/usePointerDrag'
import { messageFor } from '@/lib/fields'
import { formatValue } from '@/lib/format'
import { DetachedNotice } from './DetachedNotice'
import { M1_QUANTITY, OBLIQUE_INPUTS, OBLIQUE_KINDS, OBLIQUE_OUTPUTS } from './model'
import { ThetaBetaChart } from './ThetaBetaChart'
import { useObliqueSolver } from './useObliqueSolver'
import { WedgeDiagram } from './WedgeDiagram'

const INPUT_OUTPUT = { thetaWeak: 'thetaDeg', thetaStrong: 'thetaDeg', beta: 'betaDeg', m1n: 'm1n' } as const

export function ObliqueCalculator() {
  const s = useObliqueSolver()
  const drag = usePointerDrag()
  const stale = s.error !== null
  const { solution } = s
  const state = solution.kind === 'attached' ? solution.state : null
  const wedgeTheta = state?.thetaDeg ?? s.inputThetaDeg ?? solution.max.thetaMaxDeg

  return (
    <CalculatorLayout
      inputs={
        <>
          <NumberField quantity={M1_QUANTITY} value={s.m1Text} onChange={s.setM1Text} error={messageFor(s.error, 'm1')} tone="up" hint="must be supersonic" />
          <KindSelect label="Known quantity" kinds={OBLIQUE_KINDS} quantities={OBLIQUE_INPUTS} value={s.kind} onChange={s.setKind} />
          <NumberField quantity={OBLIQUE_INPUTS[s.kind]} value={s.valueText} onChange={s.setValueText} error={messageFor(s.error, 'value')} tone="up" hint="↑/↓ to step, Shift for ×10" />
          <GammaField value={s.gamma.text} onChange={s.gamma.setText} error={messageFor(s.error, 'gamma')} />
        </>
      }
      intro={
        <p>
          A straight oblique shock from a wedge or compression ramp. For each θ below θmax there is a weak and a strong
          solution; the weak one is what you normally see. Drag the point on the θ-β-M chart to sweep the wave angle.
        </p>
      }
    >
      <Panel
        title="Across the shock"
        caption={
          <span className="num">
            θmax {formatValue(solution.max.thetaMaxDeg, 5)}° at β {formatValue(solution.max.betaDeg, 5)}°
          </span>
        }
      >
        {solution.kind === 'detached' ? <DetachedNotice thetaDeg={s.inputThetaDeg} m1={s.m1} max={solution.max} /> : null}
        <Readout
          stale={stale || state === null}
          rows={OBLIQUE_OUTPUTS.map(([key, quantity]) => ({
            key,
            quantity,
            value: state === null ? null : state[key],
            isInput: key === INPUT_OUTPUT[s.kind],
          }))}
        />
      </Panel>
      <div className="grid gap-6 2xl:grid-cols-2">
        <Panel title="Flow over a ramp">
          <div className="graph-paper px-4 py-3">
            <WedgeDiagram thetaDeg={wedgeTheta} betaDeg={state?.betaDeg ?? null} m1={s.m1} stale={stale} dragging={drag.dragging} />
          </div>
        </Panel>
        <Panel title="θ-β-M diagram" caption="drag the point, or focus it and use ↑/↓">
          <div className="graph-paper px-1 py-2 sm:px-3">
            <ThetaBetaChart
              m1={s.m1}
              gamma={s.gamma.value}
              max={solution.max}
              point={state === null ? null : { thetaDeg: state.thetaDeg, betaDeg: state.betaDeg }}
              detachedThetaDeg={s.inputThetaDeg}
              onBeta={s.setBeta}
              drag={drag}
              stale={stale}
            />
          </div>
        </Panel>
      </div>
      {state === null ? null : (
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
      )}
    </CalculatorLayout>
  )
}
