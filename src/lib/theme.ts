export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'theme'

/** A stored explicit choice wins; otherwise follow the system preference. */
export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return prefersDark ? 'dark' : 'light'
}
