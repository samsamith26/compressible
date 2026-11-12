/**
 * Pixel geometry for the wedge/ramp diagram (y grows downwards). Pure, so it is unit-tested;
 * the component only maps it to SVG. The detached bow shock is schematic, not computed flow.
 */

export interface WedgeInput {
  readonly width: number
  readonly height: number
  readonly thetaDeg: number
  /** Shock wave angle, or null when the shock is detached. */
  readonly betaDeg: number | null
  readonly m1: number
  readonly streamlines?: number
}

export interface WedgeGeometry {
  readonly apex: { readonly x: number; readonly y: number }
  /** Solid body: flat wall, then the ramp at θ. */
  readonly bodyPath: string
  readonly surfacePath: string
  readonly streamlinePaths: readonly string[]
  /** Region ② between the shock and the ramp; null when detached. */
  readonly region2Path: string | null
  /** Bow shock outline when detached; null when attached (draw a straight shock at β). */
  readonly bowShockPath: string | null
  /** Arc path of radius r from the +x axis up to `angleDeg`, centred on the apex. */
  readonly arc: (r: number, angleDeg: number) => string
}

const rad = (deg: number): number => (deg * Math.PI) / 180
const f = (n: number): string => n.toFixed(1)

export function wedgeGeometry(input: WedgeInput): WedgeGeometry {
  const { width: W, height: H, thetaDeg, betaDeg, m1 } = input
  const n = input.streamlines ?? 7
  const apex = { x: W * 0.36, y: H * 0.8 }
  const tanT = Math.tan(rad(thetaDeg))
  const rampY = (x: number): number => apex.y - (x - apex.x) * tanT
  const surfacePath = `M0,${f(apex.y)} L${f(apex.x)},${f(apex.y)} L${f(W)},${f(rampY(W))}`
  const bodyPath = `${surfacePath} L${f(W)},${f(H)} L0,${f(H)} Z`

  const heights = Array.from({ length: n }, (_, k) => (apex.y - 14) * ((k + 1) / (n + 1)) ** 0.9)

  let streamlinePaths: string[]
  let bowShockPath: string | null = null
  let region2Path: string | null = null

  if (betaDeg !== null) {
    const cotB = 1 / Math.tan(rad(betaDeg))
    const topX = apex.x + apex.y * cotB
    const shockEdge = topX <= W ? `L${f(topX)},0 L${f(W)},0` : `L${f(W)},${f(apex.y - (W - apex.x) / cotB)}`
    region2Path = `M${f(apex.x)},${f(apex.y)} ${shockEdge} L${f(W)},${f(rampY(W))} Z`
    streamlinePaths = heights.map((h) => {
      const y = apex.y - h
      const xs = apex.x + h * cotB
      // Same command structure in both cases, so CSS `d` transitions can interpolate.
      return xs >= W
        ? `M0,${f(y)} L${f(W)},${f(y)} L${f(W)},${f(y)}`
        : `M0,${f(y)} L${f(xs)},${f(y)} L${f(W)},${f(y - (W - xs) * tanT)}`
    })
  } else {
    // Hyperbola with its nose ahead of the apex and asymptotes at the Mach angle.
    const cotMu = Math.sqrt(m1 * m1 - 1)
    const r = H * 0.16
    const standoff = Math.min(W * 0.2, Math.max(14, (W * 0.05) / Math.max(0.2, m1 - 1)))
    const noseX = apex.x - standoff
    const shockX = (h: number): number => noseX + r * cotMu * (Math.sqrt(1 + (h / r) ** 2) - 1)
    const samples = Array.from({ length: 25 }, (_, i) => (apex.y * i) / 24)
    bowShockPath = samples.map((h, i) => `${i === 0 ? 'M' : 'L'}${f(shockX(h))},${f(apex.y - h)}`).join(' ')
    streamlinePaths = heights.map((h) => {
      const y = apex.y - h
      const xs = Math.min(W, shockX(h))
      // Behind the bow shock the (subsonic) flow turns smoothly to follow the ramp.
      const endY = Math.min(y, rampY(W) - 6) - h * 0.15
      return `M0,${f(y)} L${f(xs)},${f(y)} Q${f(Math.max(xs, apex.x) + 30)},${f(y)} ${f(W)},${f(endY)}`
    })
  }

  const arc = (r: number, angleDeg: number): string => {
    const a = rad(angleDeg)
    return `M${f(apex.x + r)},${f(apex.y)} A${r},${r} 0 0 0 ${f(apex.x + r * Math.cos(a))},${f(apex.y - r * Math.sin(a))}`
  }

  return { apex, bodyPath, surfacePath, streamlinePaths, region2Path, bowShockPath, arc }
}
