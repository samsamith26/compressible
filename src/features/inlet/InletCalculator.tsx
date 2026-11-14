import { CalculatorLayout } from '@/components/CalculatorLayout'
import { GammaField } from '@/components/GammaField'
import { NumberField } from '@/components/NumberField'
import { Panel } from '@/components/Panel'
import { useMemo } from 'react'
import { useDocumentTheme } from '@/hooks/useDocumentTheme'
import { messageFor } from '@/lib/fields'
import { CompareSummary } from './CompareSummary'
import { FlowField } from './FlowField'
import { inletGeometry } from './geometry'
import { ConflictNotice, DetachedRampNotice } from './InletNotices'
import { SHADE_PROPERTIES, singleRampLayout, totalTurn, type ShadeProperty } from './model'
import { shadeDomain, shadeValue } from './shade'
import { ShadeLegend } from './ShadeLegend'
import { RampEditor } from './RampEditor'
import { RecoveryChart } from './RecoveryChart'
import { recoverySteps, singleSteps } from './recovery'
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
  const theme = useDocumentTheme()
  const { m1, ramps } = s.solution
  const geometry = useMemo(() => inletGeometry(chain, ramps), [chain, ramps])
  const single = useMemo(() => {
    const layout = singleRampLayout(m1, ramps, s.gamma.value)
    return layout === null ? null : { ...layout, geometry: inletGeometry(layout.chain, layout.ramps) }
  }, [m1, ramps, s.gamma.value])
  const showSingle = s.compare && single !== null
  const domain = shadeDomain(
    chain.regions.map((r) => shadeValue(r, s.property)),
    showSingle ? single.chain.regions.map((r) => shadeValue(r, s.property)) : [],
  )

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
      {geometry.conflict === null ? null : <ConflictNotice conflict={geometry.conflict} />}
      <Panel title="Flow field" caption={<ShadeLegend property={s.property} domain={domain} theme={theme} />}>
        <div className={showSingle ? 'grid gap-4 p-3 md:grid-cols-[3fr_2fr] md:items-end' : 'p-3'}>
          <figure className="m-0 grid min-w-0 gap-1">
            <FlowField
              label={`Multi-ramp flow field, ${ramps.length} ramp${ramps.length === 1 ? '' : 's'}`}
              geometry={geometry}
              chain={chain}
              ramps={ramps}
              property={s.property}
              domain={domain}
              selected={s.selected}
              interactive
              onSelectShock={s.select}
              onCorner={(i, r) => s.setCorner(i, r.thetaDeg, r.length)}
              stale={stale}
            />
            <figcaption className="text-xs text-muted">
              {ramps.length} ramp{ramps.length === 1 ? '' : 's'} · drag a corner or focus it and use the arrow keys
            </figcaption>
          </figure>
          {showSingle ? (
            <figure className="m-0 grid min-w-0 gap-1">
              <FlowField
                label="Single-shock comparison"
                geometry={single.geometry}
                chain={single.chain}
                ramps={single.ramps}
                property={s.property}
                domain={domain}
                selected={null}
                interactive={false}
                maxHeight={240}
                stale={stale}
              />
              <figcaption className="text-xs text-muted">one ramp turning the full {totalTurn(ramps)}°</figcaption>
            </figure>
          ) : null}
        </div>
      </Panel>
      <Panel title="Total-pressure recovery" caption="p₀/p₀₁ after each shock">
        <div className="p-3">
          <RecoveryChart
            steps={recoverySteps(chain)}
            single={s.compare ? singleSteps(s.solution.single) : null}
            rampCount={ramps.length}
            totalTurnDeg={totalTurn(ramps)}
            stale={stale}
          />
        </div>
        {s.compare && chain.regions.at(-1) !== undefined ? (
          <div className="border-t border-rule">
            <CompareSummary
              final={chain.regions.at(-1) ?? chain.regions[0]!}
              rampCount={ramps.length}
              single={s.solution.single}
              m1={m1}
              totalTurnDeg={totalTurn(ramps)}
            />
          </div>
        ) : null}
      </Panel>
      <Panel title="Regions" caption="ratios relative to the freestream (region 1)">
        <RegionTable regions={chain.regions} highlight={s.selected + 1} stale={stale} />
      </Panel>
    </CalculatorLayout>
  )
}
