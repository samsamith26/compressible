import { describe, expect, it } from 'vitest'
import { resolveTheme } from '../theme'

describe('resolveTheme', () => {
  it('uses a stored choice first', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('falls back to the system preference', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
  })

  it('ignores unknown stored values', () => {
    expect(resolveTheme('bogus', false)).toBe('light')
  })
})
