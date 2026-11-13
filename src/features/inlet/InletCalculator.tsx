import { CalculatorLayout } from '@/components/CalculatorLayout'
import { GammaField } from '@/components/GammaField'
import { NumberField } from '@/components/NumberField'
import { Panel } from '@/components/Panel'
import { messageFor } from '@/lib/fields'
import { DetachedRampNotice } from './InletNotices'
import { SHADE_PROPERTIES, type ShadeProperty } from './model'
import { RampEditor } from './RampEditor'
import { RegionTable } from './RegionTable'
import { useInlet } from './useInlet'

const PROPERTY_NAMES: Readonly<Record<ShadeProperty, string>> = {
  M: 'Mach number M',
  p: 'static pressure p/p₁',
  T: 'temperature T/T₁',
  p0: 'total-pressure recovery p₀/p₀₁',
}

export function InletCalculator() {
  const s = useInlet()
  const { chain } = s.solution
  const stale = s.error !== null
  const detached = chain.shocks.find((sh) => sh.kind === 'detached')

  return (
    <CalculatorLayout
      inputs={
        <>
          <NumberField
            quantity={{ label: 'M₁', name: 'freestream Mach number' }}
            value={s.m1Text}
            onChange={s.setM1Text}
            error={messageFor(s.error, 'm1')}
            tone="up"
          />
          <GammaField value={s.gamma.text} onChange={s.gamma.setText} error={messageFor(s.error, 'gamma')} />
          <RampEditor
            thetaTexts={s.thetaTexts}
            lengthTexts={s.lengthTexts}
            error={s.error}
            onTheta={s.setThetaText}
            onLength={s.setLengthText}
            onAdd={s.addRamp}
            onRemove={s.removeRamp}
          />
          <div className="grid gap-1.5">
            <label htmlFor="inlet-shade" className="text-sm font-medium">
              Shade regions by
            </label>
            <select
              id="inlet-shade"
              value={s.property}
              onChange={(e) => {
                const next = SHADE_PROPERTIES.find((p) => p === e.target.value)
                if (next !== undefined) s.setProperty(next)
              }}
              className="h-10 w-full cursor-pointer rounded-md border border-rule bg-panel px-3 text-base outline-none focus:border-ring"
            >
              {SHADE_PROPERTIES.map((p) => (
                <option key={p} value={p}>
                  {PROPERTY_NAMES[p]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.compare} onChange={(e) => s.setCompare(e.target.checked)} className="size-4 accent-[var(--up)]" />
            Compare with a single shock
          </label>
        </>
      }
      intro={
        <p>
          An external-compression inlet turns the flow in steps. Each ramp adds a weak oblique shock fed by the region
          before it, so pressure rises with far less total-pressure loss than one strong turn. Drag a ramp corner, or
          type its angle and length.
        </p>
      }
    >
      {detached?.kind === 'detached' ? <DetachedRampNotice shock={detached} /> : null}
      <Panel title="Regions" caption="ratios relative to the freestream (region 1)">
        <RegionTable regions={chain.regions} highlight={s.selected + 1} stale={stale} />
      </Panel>
    </CalculatorLayout>
  )
}
