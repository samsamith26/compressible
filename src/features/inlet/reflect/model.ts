/**
 * Reflecting-shock (internal compression) inlet: a ramp at θ from the leading edge, a flat cowl at
 * height H, channel length L. The leading-edge shock reflects back and forth between the walls;
 * each reflection turns the flow by θ back parallel to the wall it leaves, so every shock is a weak
 * oblique shock with turning θ fed by the previous region. Pure; no React.
 */

import { ok, solveOblique, type Result } from '@/physics'
import type { Chain, Pt, Region, ShockLink } from '@/features/inlet/shared/types'

export interface ReflectInput {
  readonly m1: number
  readonly thetaDeg: number
  /** Cowl height above the leading edge. */
  readonly height: number
  /** Channel length. */
  readonly length: number
}

export type ReflectStop =
  /** The next shock would leave the channel through its end. */
  | { readonly kind: 'channelEnd' }
  /** The channel has narrowed to under 1% of H at the next reflection: the walls effectively meet. */
  | { readonly kind: 'wallsMeet' }
  /** θ exceeds θmax for the flow reaching this reflection point: a Mach reflection forms (not modelled). */
  | { readonly kind: 'machReflection'; readonly at: Pt; readonly upstreamMach: number; readonly thetaMaxDeg: number }
  /** θ exceeds θmax at M₁: a bow shock stands off the leading edge. */
  | { readonly kind: 'leadingEdge'; readonly thetaMaxDeg: number }
  /** A shock just under θmax left subsonic flow, so no further oblique shock can form. */
  | { readonly kind: 'subsonic'; readonly at: Pt; readonly upstreamMach: number }

export interface ReflectShock {
  /** 1-based. */
  readonly index: number
  readonly from: Pt
  readonly to: Pt
  readonly fromWall: 'ramp' | 'cowl'
  /** The shock's angle to the wall it leaves, β − θ. */
  readonly wallAngleDeg: number
}

export interface ReflectSolution {
  readonly input: ReflectInput
  readonly chain: Chain
  readonly shocks: readonly ReflectShock[]
  readonly stop: ReflectStop
  /** Where the drawn channel ends: min(L, the walls' meeting point). */
  readonly channelEndX: number
  /** Where the ramp would reach the cowl: H / tan θ. */
  readonly meetX: number
}

const MAX_SHOCKS = 100
/** The walls "meet" when the channel at the next reflection is narrower than this fraction of H. */
const CLOSED_GAP = 0.01

function rad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Where shock k (leaving `from` on `wall`) meets the opposite wall, ignoring the channel end. */
function impingement(from: Pt, wall: 'ramp' | 'cowl', betaDeg: number, thetaDeg: number, height: number): Pt {
  if (wall === 'ramp') {
    // Drawn at β above horizontal (the incoming flow is horizontal) up to the cowl.
    return { x: from.x + (height - from.y) / Math.tan(rad(betaDeg)), y: height }
  }
  // Drawn at β − θ below horizontal (the incoming flow is at θ) down to the ramp y = x·tan θ.
  const down = Math.tan(rad(betaDeg - thetaDeg))
  const x = (from.y + down * from.x) / (Math.tan(rad(thetaDeg)) + down)
  return { x, y: x * Math.tan(rad(thetaDeg)) }
}

/** Where the shock crosses the channel end x = `endX`. */
function exitPoint(from: Pt, to: Pt, endX: number): Pt {
  const t = (endX - from.x) / (to.x - from.x)
  return { x: endX, y: from.y + (to.y - from.y) * t }
}

export function solveReflect(input: ReflectInput, gamma: number): Result<ReflectSolution> {
  const { m1, thetaDeg, height } = input
  const meetX = height / Math.tan(rad(thetaDeg))
  const channelEndX = Math.min(input.length, meetX)
  const regions: Region[] = [
    { index: 1, mach: m1, betaDeg: null, thetaLocalDeg: 0, flowDeg: 0, pP1: 1, rhoRho1: 1, tT1: 1, p0P01: 1 },
  ]
  const links: ShockLink[] = []
  const shocks: ReflectShock[] = []
  let from: Pt = { x: 0, y: 0 }
  let wall: 'ramp' | 'cowl' = 'ramp'

  const done = (stop: ReflectStop, detachedAt: number | null): Result<ReflectSolution> =>
    ok({ input, chain: { regions, shocks: links, detachedAt }, shocks, stop, channelEndX, meetX })

  for (let k = 1; k <= MAX_SHOCKS; k++) {
    const up = regions[k - 1]
    if (up === undefined) break
    if (k > 1 && !(up.mach > 1)) {
      links.push({ kind: 'subsonic', index: k, upstreamMach: up.mach, thetaDeg })
      return done({ kind: 'subsonic', at: from, upstreamMach: up.mach }, k)
    }
    const r = solveOblique(up.mach, { kind: 'thetaWeak', value: thetaDeg }, gamma)
    if (!r.ok) return r
    if (r.value.kind === 'detached') {
      links.push({ kind: 'detached', index: k, upstreamMach: up.mach, thetaDeg, max: r.value.max })
      const stop: ReflectStop =
        k === 1
          ? { kind: 'leadingEdge', thetaMaxDeg: r.value.max.thetaMaxDeg }
          : { kind: 'machReflection', at: from, upstreamMach: up.mach, thetaMaxDeg: r.value.max.thetaMaxDeg }
      return done(stop, k)
    }

    const s = r.value.state
    links.push({ kind: 'attached', index: k, upstreamMach: up.mach, thetaDeg, state: s, max: r.value.max })
    regions.push({
      index: k + 1,
      mach: s.m2,
      betaDeg: s.betaDeg,
      thetaLocalDeg: thetaDeg,
      // Turning off the ramp leaves flow parallel to the ramp; off the cowl, parallel to the cowl.
      flowDeg: wall === 'ramp' ? thetaDeg : 0,
      pP1: up.pP1 * s.p2P1,
      rhoRho1: up.rhoRho1 * s.rho2Rho1,
      tT1: up.tT1 * s.t2T1,
      p0P01: up.p0P01 * s.p02P01,
    })

    const hit = impingement(from, wall, s.betaDeg, thetaDeg, height)
    const leaves = hit.x > channelEndX
    const to = leaves ? exitPoint(from, hit, channelEndX) : hit
    shocks.push({ index: k, from, to, fromWall: wall, wallAngleDeg: s.betaDeg - thetaDeg })
    if (leaves) return done({ kind: 'channelEnd' }, null)
    if (height - hit.x * Math.tan(rad(thetaDeg)) < CLOSED_GAP * height) return done({ kind: 'wallsMeet' }, null)

    from = hit
    wall = wall === 'ramp' ? 'cowl' : 'ramp'
  }
  return done({ kind: 'wallsMeet' }, null)
}
