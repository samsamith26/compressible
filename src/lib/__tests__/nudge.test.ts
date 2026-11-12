import { describe, expect, it } from 'vitest'
import { nudge } from '../nudge'

describe('nudge', () => {
  it.each([
    [2.37, 1, false, 2.47],
    [2, 1, false, 2.1],
    [2, -1, true, 1],
    [0.5, 1, false, 0.51],
    [10, -1, false, 9],
    [1.4, -1, false, 1.3],
    [0, 1, false, 0.1],
    [0, -1, true, -1],
  ] as const)('nudge(%d, %d, coarse=%s) = %d', (value, dir, coarse, expected) => {
    expect(nudge(value, dir, coarse)).toBe(expected)
  })
})
