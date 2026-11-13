import { describe, expect, it } from 'vitest'
import { separatedLabels } from '../scales'

describe('separatedLabels', () => {
  it('drops a label that would sit within the gap of an earlier one', () => {
    const ys: Record<string, number> = { p: 100, rho: 108, t: 60 }
    expect(separatedLabels(['p', 'rho', 't'], (k) => ys[k] ?? 0, 13)).toEqual(['p', 't'])
  })

  it('keeps every label when they are far enough apart', () => {
    const ys: Record<string, number> = { p: 100, rho: 80, t: 40 }
    expect(separatedLabels(['p', 'rho', 't'], (k) => ys[k] ?? 0, 13)).toEqual(['p', 'rho', 't'])
  })
})
