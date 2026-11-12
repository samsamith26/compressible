import { describe, expect, it } from 'vitest'
import { resolveTheme } from '../theme'

describe('resolveTheme', () => {
  it('prefers a saved choice', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
  it('falls back to the system preference', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme('garbage', false)).toBe('light')
  })
})
