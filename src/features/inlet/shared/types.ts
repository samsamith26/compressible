/** Types shared by both inlet modes: a chain of shocks and the regions between them. */

import type { MaxDeflection, ObliqueShockState } from '@/physics'

/** A point in model units (y up). */
export interface Pt {
  readonly x: number
  readonly y: number
}

export interface Region {
  /** 1-based. Region 1 is the freestream; region i+1 lies behind shock i. */
  readonly index: number
  readonly mach: number
  /** Wave angle of the shock that created this region; null for the freestream. */
  readonly betaDeg: number | null
  /** The turn applied by the shock that formed this region (0 for the freestream). */
  readonly thetaLocalDeg: number
  /** Flow direction in this region, degrees above horizontal (ramp series: the wall angle under it). */
  readonly flowDeg: number
  readonly pP1: number
  readonly rhoRho1: number
  readonly tT1: number
  readonly p0P01: number
}

interface ShockCore {
  /** 1-based ramp index. */
  readonly index: number
  readonly upstreamMach: number
  readonly thetaDeg: number
}

/**
 * One ramp's shock. `detached`: θ exceeds θmax for the incoming Mach number. `subsonic`: the
 * region before this ramp is already subsonic (a weak shock just under θmax can leave M < 1), so
 * no oblique shock can form. Either ends the chain.
 */
export type ShockLink =
  | (ShockCore & { readonly kind: 'attached'; readonly state: ObliqueShockState; readonly max: MaxDeflection })
  | (ShockCore & { readonly kind: 'detached'; readonly max: MaxDeflection })
  | (ShockCore & { readonly kind: 'subsonic' })

export interface Chain {
  readonly regions: readonly Region[]
  readonly shocks: readonly ShockLink[]
  /** 1-based index of the ramp where the chain stopped (detached or subsonic), or null if it didn't. */
  readonly detachedAt: number | null
}

export interface RegionShape {
  readonly index: number
  readonly polygon: readonly Pt[]
  /** A point inside the region, near its wall, for the region number. */
  readonly label: Pt
}

export type ShadeProperty = 'M' | 'p' | 'T' | 'p0'
export const SHADE_PROPERTIES: readonly ShadeProperty[] = ['M', 'p', 'T', 'p0']
