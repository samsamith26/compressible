import { TriangleAlert } from 'lucide-react'

/** Detachment is a valid outcome, so it is a status (with icon and words), not an error. */
export function DetachedNote({ thetaDeg, thetaMaxDeg, m1 }: { thetaDeg: number; thetaMaxDeg: number; m1: number }) {
  return (
    <div role="status" className="flex max-w-2xl gap-3 border-l-[3px] border-l-detached py-1 pl-3 text-base text-ink">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-detached" />
      <p className="m-0">
        <strong className="font-bold">Shock detached:</strong> θ = {Number(thetaDeg.toPrecision(6))}° is more than θ
        <sub>max</sub> = {thetaMaxDeg.toFixed(2)}° for M<sub>1</sub> = {Number(m1.toPrecision(6))}. No straight shock can
        turn the flow this far, so a curved bow shock stands off ahead of the ramp. Lower θ or raise M<sub>1</sub> to
        reattach it.
      </p>
    </div>
  )
}
