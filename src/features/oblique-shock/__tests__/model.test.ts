import { describe, expect, it } from 'vitest'
import { thetaFromBetaDeg } from '@/physics'
import {
  dragToInput,
  isObliqueKind,
  OBLIQUE_KINDS,
  seedValue,
  solveObliqueText,
  thetaBetaCurves,
  thetaMaxLocus,
  wedgeGeometry,
  type ObliqueView,
} from '../model'

function view(...args: Parameters<typeof solveObliqueText>): ObliqueView {
  const s = solveObliqueText(...args)
  if (s.result === null || !s.result.ok) throw new Error('expected a solved view')
  return s.result.value
}

describe('kinds', () => {
  it('lists the four VT input kinds in VT order', () => {
    expect(OBLIQUE_KINDS.map((k) => k.kind)).toEqual(['thetaWeak', 'thetaStrong', 'beta', 'm1n'])
    expect(isObliqueKind('beta')).toBe(true)
    expect(isObliqueKind('m1')).toBe(false)
  })
})

describe('solveObliqueText', () => {
  it('gives both solutions for a turn angle and selects the weak one', () => {
    const v = view('1.4', '2', 'thetaWeak', '10')
    if (v.kind !== 'attached') throw new Error('expected attached')
    expect(v.selected).toBe('weak')
    expect(v.weak.betaDeg).toBeCloseTo(39.3139, 3)
    expect(v.strong.betaDeg).toBeCloseTo(83.7001, 3)
  })

  it('selects the strong solution for the strong-shock kind', () => {
    const v = view('1.4', '2', 'thetaStrong', '10')
    expect(v.kind === 'attached' && v.selected).toBe('strong')
  })

  it('selects by wave angle for a β input and keeps the exact input state', () => {
    const v = view('1.4', '2', 'beta', '80')
    if (v.kind !== 'attached') throw new Error('expected attached')
    expect(v.selected).toBe('strong')
    expect(v.strong.betaDeg).toBe(80)
    expect(v.weak.betaDeg).toBeLessThan(v.max.betaDeg)
  })

  it('reports detachment above θmax with the requested θ', () => {
    const v = view('1.4', '2', 'thetaWeak', '30')
    expect(v.kind).toBe('detached')
    expect(v.kind === 'detached' && v.thetaDeg).toBe(30)
    expect(v.max.thetaMaxDeg).toBeCloseTo(22.9735, 3)
  })

  it('puts each error on the field that caused it', () => {
    expect(solveObliqueText('1.4', '0.8', 'thetaWeak', '10').field).toBe('m1')
    expect(solveObliqueText('1', '2', 'thetaWeak', '10').field).toBe('gamma')
    expect(solveObliqueText('1.4', '2', 'beta', '10').field).toBe('value')
    expect(solveObliqueText('1.4', '2', 'm1n', '3').field).toBe('value')
    expect(solveObliqueText('1.4', 'x', 'thetaWeak', '10').field).toBe('m1')
  })

  it('waits while any input is half-typed', () => {
    expect(solveObliqueText('1.4', '2.', 'thetaWeak', '10').result).toBeNull()
  })
})

describe('seedValue', () => {
  it('re-expresses the selected solution in the new kind', () => {
    const v = view('1.4', '2', 'thetaWeak', '10')
    expect(seedValue('beta', v)).toBe('39.3139')
    expect(seedValue('thetaStrong', v)).toBe('10')
    expect(Number(seedValue('m1n', v))).toBeCloseTo(1.26714, 4)
  })

  it('keeps the requested θ when detached and gives null for kinds that cannot express it', () => {
    const v = view('1.4', '2', 'thetaWeak', '30')
    expect(seedValue('thetaStrong', v)).toBe('30')
    expect(seedValue('beta', v)).toBeNull()
  })
})

describe('dragToInput', () => {
  it('maps a β on the chart to the user’s kind', () => {
    expect(dragToInput('beta', 2, 50, 1.4)).toEqual({ kind: 'beta', value: '50' })
    const t = dragToInput('thetaWeak', 2, 50, 1.4)
    expect(t.kind).toBe('thetaWeak')
    expect(Number(t.value)).toBeCloseTo(thetaFromBetaDeg(2, 50, 1.4), 2)
  })

  it('switches between weak and strong as the point crosses β at θmax', () => {
    expect(dragToInput('thetaWeak', 2, 80, 1.4).kind).toBe('thetaStrong')
    expect(dragToInput('thetaStrong', 2, 40, 1.4).kind).toBe('thetaWeak')
  })

  it('clamps β to [μ, 90°] so a drag never writes an invalid value', () => {
    expect(dragToInput('beta', 2, 10, 1.4).value).toBe('30')
    expect(dragToInput('beta', 2, 95, 1.4).value).toBe('90')
    expect(dragToInput('m1n', 2, 10, 1.4).value).toBe('1')
  })
})

describe('chart curves', () => {
  it('draws each M curve from the Mach angle to 90° with θ ≥ 0', () => {
    const curves = thetaBetaCurves(1.4, [2, 5])
    expect(curves.map((c) => c.m1)).toEqual([2, 5])
    const two = curves[0]!.points
    expect(two[0]![0]).toBeCloseTo(30, 6)
    expect(two.at(-1)![0]).toBe(90)
    expect(two.every(([, t]) => t >= 0)).toBe(true)
  })

  it('traces θmax rising with M', () => {
    const locus = thetaMaxLocus(1.4)
    expect(locus.length).toBeGreaterThan(10)
    expect(locus.at(-1)![1]).toBeGreaterThan(locus[0]![1])
  })
})

describe('wedgeGeometry', () => {
  it('draws an attached shock from the corner and no bow', () => {
    const g = wedgeGeometry(10, 39.31, 1)
    expect(g.shock).not.toBeNull()
    expect(g.bow).toBeNull()
    expect(g.shock!.x1).toBe(g.apex[0])
  })

  it('draws a detached bow shock standing ahead of the corner', () => {
    const g = wedgeGeometry(30, null, 22.97)
    expect(g.shock).toBeNull()
    expect(g.bow).not.toBeNull()
    expect(g.standoff).toBeGreaterThan(0)
  })

  it('turns streamlines parallel to the ramp after the shock', () => {
    const g = wedgeGeometry(10, 39.31, 1)
    const line = g.streamlines[0]!
    const [a, b] = [line.at(-2)!, line.at(-1)!]
    const angle = (Math.atan2(a[1] - b[1], b[0] - a[0]) * 180) / Math.PI
    expect(angle).toBeCloseTo(10, 6)
  })
})
