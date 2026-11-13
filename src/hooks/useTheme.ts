import { useCallback, useEffect, useState } from 'react'
import { resolveTheme, THEME_STORAGE_KEY, type Theme } from '@/lib/theme'

function initialTheme(): Theme {
  const attr = document.documentElement.dataset.theme
  if (attr === 'light' || attr === 'dark') return attr
  let stored: string | null = null
  try {
    stored = localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    stored = null
  }
  return resolveTheme(stored, window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
}

/** Current theme on <html data-theme>, with a toggle that remembers the choice. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // Storage can be unavailable (private mode); the toggle still works for this visit.
      }
      return next
    })
  }, [])

  return { theme, toggle }
}
