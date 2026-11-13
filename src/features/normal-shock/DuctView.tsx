import { ShockPath, Streamlines } from '@/components/porthole/flow'
import { SvgQuantity } from '@/components/Quantity'
import { Porthole } from '@/components/porthole/Porthole'
import { densityFill, WINDOW } from '@/components/porthole/shade'
import { formatValue } from '@/lib/format'
import type { NormalShockState } from '@/physics'

const TOP = 56
const BOTTOM = 144
const SHOCK_X = 100

/** A constant-area duct with a normal shock: lighter, faster gas upstream; denser downstream. */
export function DuctView({ state }: { state: NormalShockState }) {
  const streams = [78, 100, 122].map((y) => [
    [0, y],
    [200, y],
  ] satisfies [number, number][])

  return (
    <Porthole
      label="Duct with a normal shock"
      description={`Flow left to right. Density rises ${formatValue(state.rho2Rho1, 4)}× across the shock; shading: brighter is denser.`}
    >
      <rect x="0" y="0" width="200" height="200" fill={WINDOW.wall} />
      <rect x="0" y={TOP} width={SHOCK_X} height={BOTTOM - TOP} fill={densityFill(1)} className="transition-colors" />
      <rect x="0" y={TOP} width={SHOCK_X} height={BOTTOM - TOP} fill={WINDOW.s1} fillOpacity={0.18} />
      <rect x={SHOCK_X} y={TOP} width={100} height={BOTTOM - TOP} fill={densityFill(state.rho2Rho1)} className="transition-colors" />
      <rect x={SHOCK_X} y={TOP} width={100} height={BOTTOM - TOP} fill={WINDOW.s2} fillOpacity={0.18} />
      <Streamlines lines={streams} />
      <line x1="0" x2="200" y1={TOP} y2={TOP} stroke={WINDOW.wallEdge} strokeWidth={1.5} />
      <line x1="0" x2="200" y1={BOTTOM} y2={BOTTOM} stroke={WINDOW.wallEdge} strokeWidth={1.5} />
      <ShockPath d={`M${SHOCK_X},${TOP} L${SHOCK_X},${BOTTOM}`} />
      <text x={52} y={TOP + 16} textAnchor="middle" fill="#e6ebef" fontSize={10}>
        <SvgQuantity label="M_1" /> <tspan className="num">{formatValue(state.m1, 3)}</tspan>
      </text>
      <text x={150} y={TOP + 16} textAnchor="middle" fill="#e6ebef" fontSize={10}>
        <SvgQuantity label="M_2" /> <tspan className="num">{formatValue(state.m2, 3)}</tspan>
      </text>
    </Porthole>
  )
}
