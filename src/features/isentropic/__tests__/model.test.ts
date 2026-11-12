import { describe, expect, it } from 'vitest'
import { isentropicFromMach } from '@/physics'
import {
  ISENTROPIC_KINDS,
  inputFromMach,
  isentropicValue,
  solveIsentropicText,
} from '../model'

const gamma = 1.4

describe('solveIsentropicText', () => {
  it('solves from typed text', () => {
    const r = solveIsentropicText('pP0', '0.12780452', '1.4')
    expect(r.ok && r.value.mach).toBeCloseTo(2, 6)
  })
  it('reports unparsable values and γ by name', () => {
    const v = solveIsentropicText('mach', '2.', '1.4')
    expect(v.ok).toBe(true)
    const bad = solveIsentropicText('mach', 'x', '1.4')
    expect(!bad.ok && bad.error.message).toBe('Enter a number for Mach number')
    const g = solveIsentropicText('mach', '2', '')
    expect(!g.ok && g.error.message).toBe('Enter a number for γ')
  })
  it('passes physics errors through', () => {
    const r = solveIsentropicText('pP0', '2', '1.4')
    expect(!r.ok && r.error.message).toMatch(/p\/p0/)
  })
})

describe('isentropicValue', () => {
  const r = isentropicFromMach(2, gamma)
  it('reads back the value for every input kind', () => {
    if (!r.ok) throw new Error('setup')
    // A/A* at M = 2 also has a subsonic root, so only the supersonic branch round-trips.
    for (const kind of ISENTROPIC_KINDS.filter((k) => k !== 'areaSub')) {
      const v = isentropicValue(r.value, kind)
      expect(v).not.toBeNull()
      const back = solveIsentropicText(kind, String(v), '1.4')
      expect(back.ok && back.value.mach).toBeCloseTo(2, 8)
    }
  })
  it('returns null for angles in subsonic flow', () => {
    const sub = isentropicFromMach(0.5, gamma)
    if (!sub.ok) throw new Error('setup')
    expect(isentropicValue(sub.value, 'machAngleDeg')).toBeNull()
    expect(isentropicValue(sub.value, 'areaSup')).toBe(sub.value.aAStar)
  })
})

describe('inputFromMach', () => {
  it('keeps the current kind when it can express the Mach number', () => {
    const next = inputFromMach('pP0', 2, gamma)
    expect(next.kind).toBe('pP0')
    expect(next.value).toBeCloseTo(0.12780452, 7)
  })
  it('switches the area branch to match the Mach number', () => {
    expect(inputFromMach('areaSup', 0.5, gamma).kind).toBe('areaSub')
    expect(inputFromMach('areaSub', 2, gamma).kind).toBe('areaSup')
  })
  it('falls back to Mach for supersonic-only kinds below M = 1', () => {
    expect(inputFromMach('machAngleDeg', 0.5, gamma)).toEqual({ kind: 'mach', value: 0.5 })
    expect(inputFromMach('prandtlMeyerDeg', 0.8, gamma)).toEqual({ kind: 'mach', value: 0.8 })
  })
})
