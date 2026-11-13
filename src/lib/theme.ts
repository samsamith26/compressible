export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'theme'

/** A saved choice wins; otherwise follow the operating system. */
export function resolveTheme(saved: string | null, systemPrefersDark: boolean): Theme {
  if (saved === 'light' || saved === 'dark') return saved
  return systemPrefersDark ? 'dark' : 'light'
}
