import { formatValue } from '@/lib/format'
import type { ShockLink } from './model'

/** A detached ramp ends the chain. Detachment is information (amber), not an error. */
export function DetachedRampNotice({ shock }: { readonly shock: Extract<ShockLink, { kind: 'detached' }> }) {
  return (
    <div role="status" className="border-l-2 border-down bg-down/8 px-4 py-3 text-sm leading-relaxed">
      <p className="font-medium text-down">Shock {shock.index} is detached</p>
      <p className="text-ink">
        Ramp {shock.index} turns the flow θ = <span className="num">{formatValue(shock.thetaDeg, 4)}°</span>, but for its
        incoming M = <span className="num">{formatValue(shock.upstreamMach, 4)}</span> the most an attached shock can
        turn is θmax = <span className="num">{formatValue(shock.max.thetaMaxDeg, 4)}°</span>. The chain stops here:
        regions beyond ramp {shock.index} aren’t computed.
      </p>
    </div>
  )
}
