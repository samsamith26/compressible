import { formatValue } from '@/lib/format'
import type { MaxDeflection } from '@/physics'

interface DetachedNoticeProps {
  readonly thetaDeg: number | null
  readonly m1: number
  readonly max: MaxDeflection
}

/** Detachment is a valid outcome, so it reads as information (amber), not an error. */
export function DetachedNotice({ thetaDeg, m1, max }: DetachedNoticeProps) {
  return (
    <div role="status" className="border-l-2 border-down bg-down/8 px-4 py-3 text-sm leading-relaxed">
      <p className="font-medium text-down">Shock detached</p>
      <p className="text-ink">
        {thetaDeg === null ? 'This turning angle' : <>θ = <span className="num">{formatValue(thetaDeg, 4)}°</span></>} exceeds
        the maximum deflection θmax = <span className="num">{formatValue(max.thetaMaxDeg, 5)}°</span> for M₁ ={' '}
        <span className="num">{formatValue(m1, 4)}</span>. A curved bow shock stands off the wedge, and the
        flow behind it is partly subsonic, so the attached oblique-shock relations do not apply.
      </p>
    </div>
  )
}
