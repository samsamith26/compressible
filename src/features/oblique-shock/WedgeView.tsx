import { ShockPath, Streamlines } from '@/components/porthole/flow'
import { Porthole } from '@/components/porthole/Porthole'
import { densityFill, WINDOW } from '@/components/porthole/shade'
import { formatValue } from '@/lib/format'
import { selectedState, wedgeGeometry, type ObliqueView } from './model'

/** A compression ramp with its attached oblique shock, or the detached bow shock. */
export function WedgeView({ view }: { view: ObliqueView }) {
  const attached = view.kind === 'attached' ? selectedState(view) : null
  const thetaDeg = attached?.thetaDeg ?? (view.kind === 'detached' ? view.thetaDeg : 0)
  const geo = wedgeGeometry(thetaDeg, attached?.betaDeg ?? null, view.max.thetaMaxDeg)
  const rhoBehind = attached?.rho2Rho1 ?? (view.kind === 'detached' ? view.rhoBehindBow : 1)
  const shockD = geo.shock !== null ? `M${geo.shock.x1},${geo.shock.y1} L${geo.shock.x2},${geo.shock.y2}` : (geo.bow ?? '')

  const description =
    view.kind === 'attached' && attached !== null
      ? `Ramp turns the flow ${formatValue(thetaDeg, 3)}°; the ${view.selected} shock sits at β = ${formatValue(attached.betaDeg, 3)}°. Shading: brighter is denser.`
      : `Ramp turns the flow ${formatValue(thetaDeg, 3)}°, more than θmax = ${formatValue(view.max.thetaMaxDeg, 4)}°: the shock detaches and stands ahead of the corner.`

  return (
    <Porthole label="Compression ramp" description={description}>
      <rect x="0" y="0" width="200" height="200" fill={densityFill(1)} />
      <rect x="0" y="0" width="200" height="200" fill={WINDOW.s1} fillOpacity={0.18} />
      <path d={geo.downstream} fill={densityFill(rhoBehind)} className="transition-geometry" />
      <path d={geo.downstream} fill={WINDOW.s2} fillOpacity={0.2} className="transition-geometry" />
      <Streamlines lines={geo.streamlines} />
      <path d={geo.wall} fill={WINDOW.wall} stroke={WINDOW.wallEdge} strokeWidth={1.2} className="transition-geometry" />
      <ShockPath d={shockD} offset={{ x: 1.3, y: 0 }} />
    </Porthole>
  )
}
