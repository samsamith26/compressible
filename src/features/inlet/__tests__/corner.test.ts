import { describe, expect, it } from 'vitest'
import { cornerFromPointer, nudgeCorner, wallAngleBefore } from '../corner'

const ramps = [
  { thetaDeg: 8, length: 1 },
  { thetaDeg: 8, length: 0.6 },
]

describe('wallAngleBefore', () => {
  it('sums the turns of the earlier ramps', () => {
    expect(wallAngleBefore(ramps, 0)).toBe(0)
    expect(wallAngleBefore(ramps, 1)).toBe(8)
  })
})

describe('cornerFromPointer', () => {
  it('reads the ramp angle and length from the pointer, relative to the previous corner and wall', () => {
    const r = cornerFromPointer({ x: 1, y: 0 }, 8, { x: 1 + Math.cos((20 * Math.PI) / 180), y: Math.sin((20 * Math.PI) / 180) })
    expect(r.thetaDeg).toBeCloseTo(12, 9)
    expect(r.length).toBeCloseTo(1, 9)
  })

  it('clamps the angle to 0–45° and the length to 0.05–10', () => {
    expect(cornerFromPointer({ x: 0, y: 0 }, 0, { x: 1, y: -1 })).toMatchObject({ thetaDeg: 0 })
    expect(cornerFromPointer({ x: 0, y: 0 }, 0, { x: 0, y: 5 })).toMatchObject({ thetaDeg: 45 })
    expect(cornerFromPointer({ x: 0, y: 0 }, 0, { x: 0.001, y: 0 }).length).toBe(0.05)
    expect(cornerFromPointer({ x: 0, y: 0 }, 0, { x: 50, y: 0 }).length).toBe(10)
  })
})

describe('nudgeCorner', () => {
  const ramp = { thetaDeg: 8, length: 1 }
  it('steps the angle with Up/Down and the length with Left/Right; Shift steps further', () => {
    expect(nudgeCorner(ramp, 'ArrowUp', false)).toEqual({ thetaDeg: 8.5, length: 1 })
    expect(nudgeCorner(ramp, 'ArrowDown', true)).toEqual({ thetaDeg: 6, length: 1 })
    expect(nudgeCorner(ramp, 'ArrowRight', false)).toEqual({ thetaDeg: 8, length: 1.05 })
    expect(nudgeCorner(ramp, 'ArrowLeft', true)).toEqual({ thetaDeg: 8, length: 0.8 })
  })

  it('ignores other keys and respects the clamps', () => {
    expect(nudgeCorner(ramp, 'Enter', false)).toBeNull()
    expect(nudgeCorner({ thetaDeg: 0, length: 0.05 }, 'ArrowDown', false)).toEqual({ thetaDeg: 0, length: 0.05 })
    expect(nudgeCorner({ thetaDeg: 0, length: 0.05 }, 'ArrowLeft', false)).toEqual({ thetaDeg: 0, length: 0.05 })
  })
})
