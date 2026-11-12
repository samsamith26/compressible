import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { contrastRatio, readThemeTokens } from '../contrast'

describe('contrastRatio', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })
  it('accepts 3-digit hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 5)
  })
})

describe('theme palette (src/index.css)', () => {
  const css = readFileSync(fileURLToPath(new URL('../../index.css', import.meta.url)), 'utf8')
  const themes = { light: readThemeTokens(css, ':root'), dark: readThemeTokens(css, '.dark') }
  const textTokens = ['ink', 'muted', 'up', 'down', 'danger'] as const
  const grounds = ['paper', 'panel'] as const

  for (const [name, tokens] of Object.entries(themes)) {
    for (const fg of textTokens) {
      for (const bg of grounds) {
        it(`${name}: ${fg} on ${bg} meets WCAG AA (4.5:1)`, () => {
          const f = tokens.get(fg)
          const b = tokens.get(bg)
          expect(f).toBeDefined()
          expect(b).toBeDefined()
          expect(contrastRatio(f ?? '', b ?? '')).toBeGreaterThanOrEqual(4.5)
        })
      }
    }
  }
})
