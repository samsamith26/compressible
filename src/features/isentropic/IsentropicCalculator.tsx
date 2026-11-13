import { KindSelect } from '@/components/KindSelect'
import { NumberInput } from '@/components/NumberInput'
import { ProblemLine } from '@/components/ProblemLine'
import type { CalcParams } from '@/lib/urlState'
import { IsentropicReadout } from './IsentropicReadout'
import { ISENTROPIC_KINDS, kindInfo } from './model'
import { NozzleView } from './NozzleView'
import { RatioCharts } from './RatioCharts'
import { useIsentropic } from './useIsentropic'

export function IsentropicCalculator({
  initial,
  onParamsChange,
}: {
  initial: CalcParams
  onParamsChange: (p: CalcParams) => void
}) {
  const s = useIsentropic(initial, onParamsChange)
  const info = kindInfo(s.kind)

  return (
    <div className="flex flex-col gap-10">
      <ProblemLine>
        <NumberInput id="isen-gamma" label="γ" text={s.gamma} onTextChange={s.setGamma} error={s.gammaError} width="w-20" />
        <KindSelect id="isen-kind" options={ISENTROPIC_KINDS} value={s.kind} onChange={s.setKind} />
        <NumberInput id="isen-value" label={info.label} text={s.value} onTextChange={s.setValue} error={s.valueError} {...(info.unit ? { unit: info.unit } : {})} />
      </ProblemLine>
      <div className="grid items-start gap-x-12 gap-y-8 lg:grid-cols-[minmax(240px,340px)_1fr]">
        <NozzleView state={s.state} gamma={s.gammaValue} />
        <IsentropicReadout state={s.state} stale={s.stale} />
      </div>
      <RatioCharts state={s.state} gamma={s.gammaValue} onSetMach={s.setMach} />
    </div>
  )
}
