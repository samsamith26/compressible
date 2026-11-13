import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../contrast'
import { TOKENS, type ThemeTokens } from '../tokens'

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colours', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 6)
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 6)
  })

  it('is symmetric and accepts shorthand hex', () => {
    expect(contrastRatio('#fff', '#0A7FC2')).toBeCloseTo(contrastRatio('#0A7FC2', '#ffffff'), 9)
  })
})

describe.each(['light', 'dark'] as const)('%s tokens', (theme) => {
  const t: ThemeTokens = TOKENS[theme]

  it.each(['ink', 'ink2', 'error', 'detached'] as const)('text token %s meets WCAG AA (4.5:1) on bg', (k) => {
    expect(contrastRatio(t[k], t.bg)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['s1', 's2', 'cP', 'cRho', 'cT'] as const)('mark colour %s meets 3:1 on bg', (k) => {
    expect(contrastRatio(t[k], t.bg)).toBeGreaterThanOrEqual(3)
  })
})
