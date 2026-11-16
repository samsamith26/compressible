import { formatValue } from '@/lib/format'
import { plain } from '@/features/inlet/shared/labels'
import type { ReflectStop } from './model'

const AMBER = 'border-l-2 border-down bg-down/8 px-4 py-3 text-sm leading-relaxed'

/** Why the shock train ended. Failures read as amber information; ordinary ends as a quiet line. */
export function ReflectStopNotice({ stop, thetaDeg, m1, shockCount }: { readonly stop: ReflectStop; readonly thetaDeg: number; readonly m1: number; readonly shockCount: number }) {
  switch (stop.kind) {
    case 'machReflection':
      return (
        <div role="status" className={AMBER}>
          <p className="font-medium text-down">Regular reflection impossible: a Mach reflection forms here (not modeled).</p>
          <p className="text-ink">
            Reflecting shock {shockCount + 1} would have to turn the flow θ = <span className="num">{plain(thetaDeg)}°</span>,
            but at its incoming M = <span className="num">{formatValue(stop.upstreamMach, 4)}</span> the most an attached
            shock can turn is θmax = <span className="num">{formatValue(stop.thetaMaxDeg, 3)}°</span>. A normal-shock stem
            forms between the walls instead; the chain stops at the last regular reflection.
          </p>
        </div>
      )
    case 'leadingEdge':
      return (
        <div role="status" className={AMBER}>
          <p className="font-medium text-down">Bow shock at the leading edge</p>
          <p className="text-ink">
            The ramp turns the flow θ = <span className="num">{plain(thetaDeg)}°</span>, more than θmax ={' '}
            <span className="num">{formatValue(stop.thetaMaxDeg, 3)}°</span> at M₁ = <span className="num">{plain(m1)}</span>,
            so no attached shock forms and nothing reflects.
          </p>
        </div>
      )
    case 'subsonic':
      return (
        <div role="status" className={AMBER}>
          <p className="font-medium text-down">The flow is subsonic before reflection {shockCount + 1}</p>
          <p className="text-ink">
            Shock {shockCount} leaves M = <span className="num">{formatValue(stop.upstreamMach, 4)}</span>, so no further
            oblique shock can form.
          </p>
        </div>
      )
    case 'channelEnd':
      return (
        <p role="status" className="px-1 text-sm text-muted">
          Shock {shockCount} reaches the end of the channel before the opposite wall.
        </p>
      )
    case 'wallsMeet':
      return (
        <p role="status" className="px-1 text-sm text-muted">
          The walls close in: after shock {shockCount} the channel is narrower than 1% of H.
        </p>
      )
  }
}
