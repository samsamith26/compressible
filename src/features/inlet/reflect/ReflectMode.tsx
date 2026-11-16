import { useMemo } from 'react'
import { CalculatorLayout } from '@/components/CalculatorLayout'
import { GammaField } from '@/components/GammaField'
import { NumberField } from '@/components/NumberField'
import { Panel } from '@/components/Panel'
import { useDocumentTheme } from '@/hooks/useDocumentTheme'
import { messageFor } from '@/lib/fields'
import { parseNumber } from '@/lib/parseNumber'
import { RecoveryChart } from '@/features/inlet/shared/RecoveryChart'
import { recoverySteps } from '@/features/inlet/shared/recovery'
import { RegionTable } from '@/features/inlet/shared/RegionTable'
import { shadeDomain, shadeValue } from '@/features/inlet/shared/shade'
import { ShadeLegend } from '@/features/inlet/shared/ShadeLegend'
import { ShadeSelect } from '@/features/inlet/shared/ShadeSelect'
import { ShockDetail } from '@/features/inlet/shared/ShockDetail'
import { LIMITS, reflectGeometry } from './geometry'
import { ReflectField } from './ReflectField'
import { ReflectStopNotice } from './ReflectNotices'
import { useReflect } from './useReflect'

/** Reflecting shocks (internal compression): inputs, drawing and the shared inlet views. */
export function ReflectMode() {
  const s = useReflect()
  const { solution, gamma } = s.solution
  const { chain, input } = solution
  const stale = s.error !== null
  const theme = useDocumentTheme()
  const geometry = useMemo(() => reflectGeometry(solution), [solution])
  const domain = shadeDomain(
    chain.regions.map((r) => shadeValue(r, s.property)),
    [],
  )
  const attached = chain.shocks.filter((k) => k.kind === 'attached').length
  const sliderTheta = Math.min(LIMITS.theta.max, Math.max(LIMITS.theta.min, parseNumber(s.thetaText) ?? input.thetaDeg))

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
          <div className="grid gap-1">
            <NumberField
              quantity={{ label: 'θ', name: 'ramp angle', unit: '°' }}
              value={s.thetaText}
              onChange={s.setThetaText}
              error={messageFor(s.error, 'theta')}
            />
            <input
              type="range"
              min={LIMITS.theta.min}
              max={LIMITS.theta.max}
              step={LIMITS.theta.step}
              value={sliderTheta}
              onChange={(e) => s.setThetaText(e.target.value)}
              aria-label="Ramp angle"
              className="h-6 accent-[var(--up)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              quantity={{ label: 'H', name: 'cowl height' }}
              value={s.heightText}
              onChange={s.setHeightText}
              error={messageFor(s.error, 'height')}
            />
            <NumberField
              quantity={{ label: 'L', name: 'channel length' }}
              value={s.lengthText}
              onChange={s.setLengthText}
              error={messageFor(s.error, 'length')}
            />
          </div>
          <ShadeSelect value={s.property} onChange={s.setProperty} />
        </>
      }
      intro={
        <p>
          The ramp’s shock reflects off the cowl, then off the ramp, and so on. Each reflection turns the flow back parallel
          to the wall it leaves, so every shock turns it by θ. Drag the ramp, the cowl’s leading edge or the channel end,
          or type θ, H and L.
        </p>
      }
    >
      <ReflectStopNotice stop={solution.stop} thetaDeg={input.thetaDeg} m1={input.m1} shockCount={attached} />
      <Panel title="Flow field" caption={<ShadeLegend property={s.property} domain={domain} theme={theme} />}>
        <figure className="m-0 grid min-w-0 gap-1 p-3">
          <ReflectField
            geometry={geometry}
            chain={chain}
            input={input}
            property={s.property}
            domain={domain}
            selected={s.selected}
            onSelectShock={s.select}
            onTheta={s.setTheta}
            onHeight={s.setHeight}
            onLength={s.setLength}
            stale={stale}
          />
          <figcaption className="text-xs text-muted">
            {attached} shock{attached === 1 ? '' : 's'} · angles are to the wall each shock leaves · drag a handle or focus
            it and use the arrow keys
          </figcaption>
        </figure>
      </Panel>
      <Panel title="Total-pressure recovery" caption="p₀/p₀₁ after each shock">
        <div className="p-3">
          <RecoveryChart steps={recoverySteps(chain)} single={null} name={`${attached} shock${attached === 1 ? '' : 's'}`} singleName={null} stale={stale} />
        </div>
      </Panel>
      <Panel title="Regions" caption="ratios relative to the freestream (region 1)">
        <RegionTable regions={chain.regions} highlight={s.selected + 1} stale={stale} />
      </Panel>
      <ShockDetail shocks={chain.shocks} selected={s.selected} gamma={gamma} stale={stale} onSelect={s.select} onBeta={s.setThetaFromBeta} />
    </CalculatorLayout>
  )
}
