import { formatValue } from '@/lib/format'
import type { Conflict } from './geometry'
import type { ShockLink } from './model'

/** The drawing stops at the first crossing: the simple chain model can't represent what follows. */
export function ConflictNotice({ conflict }: { readonly conflict: Conflict }) {
  const [a, b] = conflict.between
  const what = conflict.kind === 'shocks' ? `Shocks ${a} and ${b} cross` : `Shock ${a} runs into ramp ${b}`
  return (
    <div role="status" className="border-l-2 border-down bg-down/8 px-4 py-3 text-sm leading-relaxed">
      <p className="font-medium text-down">{what} inside the drawing</p>
      <p className="text-ink">
        Beyond that point the waves interact, which this chain of separate oblique shocks doesn’t model, so the
        drawing is hatched there. The region values still hold along the ramps. Shorten the later ramps or reduce their
        angles to move the crossing downstream.
      </p>
    </div>
  )
}

/** A weak shock just under θmax can leave subsonic flow; the next ramp can't form an oblique shock. */
export function SubsonicRampNotice({ shock }: { readonly shock: Extract<ShockLink, { kind: 'subsonic' }> }) {
  return (
    <div role="status" className="border-l-2 border-down bg-down/8 px-4 py-3 text-sm leading-relaxed">
      <p className="font-medium text-down">The flow is subsonic before ramp {shock.index}</p>
      <p className="text-ink">
        Shock {shock.index - 1} leaves M = <span className="num">{formatValue(shock.upstreamMach, 4)}</span>, so ramp{' '}
        {shock.index} can’t form an oblique shock. The chain stops here: regions beyond ramp {shock.index - 1} aren’t
        computed.
      </p>
    </div>
  )
}

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
