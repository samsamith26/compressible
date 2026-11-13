/**
 * Colour tokens for the "colour schlieren" direction. src/index.css defines the
 * same values as CSS custom properties; contrast.test.ts checks them here.
 * Palettes were validated with the dataviz palette script (CVD separation, chroma,
 * lightness band) against these backgrounds.
 */

export interface ThemeTokens {
  /** Page background: test-section glass. */
  readonly bg: string
  readonly ink: string
  /** Secondary text. */
  readonly ink2: string
  readonly rule: string
  /** Station 1 (upstream), cyan filter hue. */
  readonly s1: string
  /** Station 2 (downstream), magenta filter hue. */
  readonly s2: string
  /** Isentropic curves: p/p0, ρ/ρ0, T/T0. */
  readonly cP: string
  readonly cRho: string
  readonly cT: string
  readonly error: string
  /** Status colour for a detached shock (always shown with an icon and label). */
  readonly detached: string
}

export const TOKENS: Readonly<Record<'light' | 'dark', ThemeTokens>> = {
  light: {
    bg: '#EEF1F3',
    ink: '#14212B',
    ink2: '#4A5866',
    rule: '#D3DAE0',
    s1: '#0A7FC2',
    s2: '#C2367A',
    cP: '#5B4BD6',
    cRho: '#1A8A6E',
    cT: '#B0600A',
    error: '#B3261E',
    detached: '#8A5A00',
  },
  dark: {
    bg: '#11171D',
    ink: '#E6EBEF',
    ink2: '#9AA8B5',
    rule: '#26313B',
    s1: '#2F95D4',
    s2: '#E2609C',
    cP: '#8E80F2',
    cRho: '#2C9F72',
    cT: '#C47E22',
    error: '#FF8A80',
    detached: '#E3B04B',
  },
}
