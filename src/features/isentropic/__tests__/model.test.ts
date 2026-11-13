import { describe, expect, it } from 'vitest'
import { isentropicFromMach, type IsentropicState } from '@/physics'
import {
  isIsentropicKind,
  ISENTROPIC_KINDS,
  machToInput,
  nozzleGeometry,
  ratioCurves,
  seedValue,
  solveIsentropicText,
} from '../model'

function state(m: number, g = 1.4): IsentropicState {
  const r = isentropicFromMach(m, g)
  if (!r.ok) throw new Error(r.error.message)
  return r.value
}

describe('kinds', () => {
  it('lists the eight VT input kinds in VT order', () => {
    expect(ISENTROPIC_KINDS.map((k) => k.kind)).toEqual([
      'mach', 'tT0', 'pP0', 'rhoRho0', 'areaSub', 'areaSup', 'machAngleDeg', 'prandtlMeyerDeg',
    ])
  })

  it('recognises valid kinds only', () => {
    expect(isIsentropicKind('pP0')).toBe(true)
    expect(isIsentropicKind('nope')).toBe(false)
  })
})

describe('solveIsentropicText', () => {
  it('solves from typed text', () => {
    const s = solveIsentropicText('1.4', 'mach', '2')
    expect(s.result?.ok && s.result.value.pP0).toBeCloseTo(0.127805, 6)
    expect(s.field).toBeNull()
  })

  it('returns no result while a number is half-typed', () => {
    expect(solveIsentropicText('1.4', 'mach', '2.').result).toBeNull()
    expect(solveIsentropicText('1.', 'mach', '2').result).toBeNull()
  })

  it('attributes physics errors to the field that caused them', () => {
    const g = solveIsentropicText('1', 'mach', '2')
    expect(g.field).toBe('gamma')
    expect(g.result?.ok).toBe(false)
    const v = solveIsentropicText('1.4', 'pP0', '1.5')
    expect(v.field).toBe('value')
    expect(!v.result?.ok && v.result?.error.message).toMatch(/^p\/p0 must be between .+ and 1$/)
  })

  it('reports text that can never be a number', () => {
    const s = solveIsentropicText('abc', 'mach', '2')
    expect(s.field).toBe('gamma')
    expect(!s.result?.ok && s.result?.error.message).toBe('γ must be a number')
  })
})

describe('seedValue', () => {
  it('gives the current state in terms of the new kind', () => {
    expect(seedValue('areaSup', state(2))).toBe('1.6875')
    expect(seedValue('pP0', state(2))).toBe('0.127805')
    expect(seedValue('machAngleDeg', state(2))).toBe('30')
  })

  it('returns null when the kind cannot describe the state', () => {
    expect(seedValue('machAngleDeg', state(0.5))).toBeNull()
  })
})

describe('machToInput (chart drags)', () => {
  it('keeps the user’s kind and converts M into it', () => {
    expect(machToInput('pP0', 2, 1.4)).toEqual({ kind: 'pP0', value: '0.127805' })
    expect(machToInput('mach', 2.345678, 1.4)).toEqual({ kind: 'mach', value: '2.346' })
  })

  it('switches area branch to match the dragged Mach number', () => {
    expect(machToInput('areaSub', 2, 1.4)?.kind).toBe('areaSup')
    expect(machToInput('areaSup', 0.5, 1.4)?.kind).toBe('areaSub')
  })

  it('refuses Mach numbers an angle kind cannot represent', () => {
    expect(machToInput('machAngleDeg', 0.5, 1.4)).toBeNull()
    expect(machToInput('prandtlMeyerDeg', 0.9, 1.4)).toBeNull()
  })
})

describe('ratioCurves', () => {
  const pts = ratioCurves(1.4, 5)

  it('samples 200 points from M = 0.05 to the end', () => {
    expect(pts).toHaveLength(200)
    expect(pts[0]?.mach).toBeCloseTo(0.05, 9)
    expect(pts.at(-1)?.mach).toBeCloseTo(5, 9)
  })

  it('has monotonically falling stagnation ratios and A/A* minimal near M = 1', () => {
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i]!.pP0).toBeLessThan(pts[i - 1]!.pP0)
    }
    const minA = Math.min(...pts.map((p) => p.aAStar))
    expect(minA).toBeGreaterThanOrEqual(1)
    expect(minA).toBeLessThan(1.001)
  })
})

describe('nozzleGeometry', () => {
  const g = (m: number) => nozzleGeometry(state(m), 1.4)

  it('puts the station upstream of the throat when subsonic and downstream when supersonic', () => {
    expect(g(0.5).stationX).toBeLessThan(g(0.5).throatX)
    expect(g(2).stationX).toBeGreaterThan(g(2).throatX)
    expect(g(1).stationX).toBeCloseTo(g(1).throatX, 6)
  })

  it('draws a wall that is narrowest at the throat', () => {
    const { upper, throatX } = g(2)
    const narrowest = upper.reduce((a, b) => (b[1] > a[1] ? b : a))
    expect(narrowest[0]).toBeCloseTo(throatX, 0)
  })

  it('clamps the station to the exit for area ratios the drawing cannot fit', () => {
    const big = g(8)
    expect(big.stationX).toBeCloseTo(big.exitX, 6)
    expect(big.clamped).toBe(true)
  })

  it('shades denser gas upstream than downstream in a supersonic nozzle', () => {
    const { stops } = g(2)
    expect(stops[0]!.rho).toBeGreaterThan(stops.at(-1)!.rho)
  })
})
