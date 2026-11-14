import { formatValue } from '@/lib/format'
import type { ObliqueSolution } from '@/physics'
import { plain } from './labels'
import type { Region } from './model'

interface CompareSummaryProps {
  readonly final: Region
  readonly rampCount: number
  readonly single: ObliqueSolution
  readonly m1: number
  readonly totalTurnDeg: number
  /** Ramp where the chain stopped (detached or subsonic), or null. */
  readonly stoppedAt: number | null
  /** Turning achieved before the chain stopped. */
  readonly turnedDeg: number
}

/** Final state of the chain beside the single-shock case, with the recovery gained. */
export function CompareSummary({ final, rampCount, single, m1, totalTurnDeg, stoppedAt, turnedDeg }: CompareSummaryProps) {
  if (stoppedAt !== null) {
    return (
      <p role="status" className="px-4 py-3 text-sm text-ink">
        The chain stops at ramp {stoppedAt} after turning {plain(turnedDeg)}° of {plain(totalTurnDeg)}°, so it can’t be
        compared like for like with a single {plain(totalTurnDeg)}° turn. Its recovery so far is p₀/p₀₁ ={' '}
        <span className="num">{formatValue(final.p0P01)}</span>.
      </p>
    )
  }
  if (single.kind === 'detached') {
    return (
      <p role="status" className="px-4 py-3 text-sm text-ink">
        A single {plain(totalTurnDeg)}° turn detaches at M₁ = {plain(m1)} (θmax {plain(single.max.thetaMaxDeg)}°), so there is no attached single shock to compare. The {rampCount}-ramp
        chain turns the same angle with p₀/p₀₁ = <span className="num">{formatValue(final.p0P01)}</span>.
      </p>
    )
  }
  const s = single.state
  const gain = final.p0P01 - s.p02P01
  const rows: readonly (readonly [string, number, number])[] = [
    ['M', final.mach, s.m2],
    ['p/p₁', final.pP1, s.p2P1],
    ['p₀/p₀₁', final.p0P01, s.p02P01],
  ]
  return (
    <div className="grid gap-2 px-4 py-3">
      <table aria-label="Final state compared" className="w-full max-w-md border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th scope="col" className="py-1 font-medium" />
            <th scope="col" className="py-1 text-right font-medium">
              {rampCount} ramp{rampCount === 1 ? '' : 's'}
            </th>
            <th scope="col" className="py-1 text-right font-medium">
              single {plain(totalTurnDeg)}°
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, multi, one]) => (
            <tr key={name} className="border-t border-rule/60">
              <th scope="row" className="py-1 text-left font-medium">
                {name}
              </th>
              <td className="num py-1 text-right">{formatValue(multi)}</td>
              <td className="num py-1 text-right">{formatValue(one)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-ink">
        <span className="num font-semibold text-ink">
          {gain >= 0 ? '+' : '−'}
          {formatValue(Math.abs(gain), 3)} recovered
        </span>{' '}
        by turning in {rampCount} step{rampCount === 1 ? '' : 's'} instead of one.
      </p>
    </div>
  )
}
