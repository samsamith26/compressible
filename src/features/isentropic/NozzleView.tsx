import { useId } from 'react'
import { Porthole } from '@/components/porthole/Porthole'
import { densityFill, WINDOW } from '@/components/porthole/shade'
import { formatValue } from '@/lib/format'
import type { IsentropicState } from '@/physics'
import { nozzleGeometry } from './model'

function pathOf(pts: readonly (readonly [number, number])[]): string {
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
}

/** A converging–diverging nozzle, shaded by density, with the current station marked. */
export function NozzleView({ state, gamma }: { state: IsentropicState; gamma: number }) {
  const id = useId()
  const geo = nozzleGeometry(state, gamma)
  const upper = pathOf(geo.upper)
  const lower = pathOf(geo.lower)
  const flow = `${upper} L${[...geo.lower].reverse().map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L')} Z`
  const first = geo.upper[0]
  const last = geo.upper.at(-1)
  const side = state.mach < 1 ? 'before the throat' : state.mach > 1 ? 'after the throat' : 'at the throat'

  return (
    <Porthole
      label="Nozzle view"
      description={`Station at A/A* = ${formatValue(state.aAStar)}, ${side}${geo.clamped ? ' (beyond the drawn exit)' : ''}. Shading: brighter is denser.`}
    >
      <defs>
        <linearGradient id={`${id}-rho`} x1={first?.[0] ?? 0} x2={last?.[0] ?? 200} y1="0" y2="0" gradientUnits="userSpaceOnUse">
          {geo.stops.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={densityFill(s.rho)} />
          ))}
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="200" fill={WINDOW.wall} />
      <path d={flow} fill={`url(#${id}-rho)`} className="transition-geometry" />
      <path d={upper} fill="none" stroke={WINDOW.wallEdge} strokeWidth={1.2} className="transition-geometry" />
      <path d={lower} fill="none" stroke={WINDOW.wallEdge} strokeWidth={1.2} className="transition-geometry" />
      <line x1={geo.throatX} x2={geo.throatX} y1={60} y2={140} stroke="#c9d3dc" strokeOpacity={0.35} strokeDasharray="2 3" />
      <g className="transition-geometry" style={{ transform: `translateX(${geo.stationX}px)` }}>
        <line y1={100 - geo.stationHalf} y2={100 + geo.stationHalf} stroke={WINDOW.s1} strokeWidth={2.5} />
        <line y1={100 - geo.stationHalf} y2={100 + geo.stationHalf} stroke="#ffffff" strokeWidth={0.8} />
      </g>
      <text x={geo.throatX} y={152} textAnchor="middle" className="num" fill="#9aa8b5" fontSize={8}>
        throat
      </text>
    </Porthole>
  )
}
