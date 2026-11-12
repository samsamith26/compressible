import { useCallback, useEffect, useState } from 'react'
import { resolveTheme, THEME_STORAGE_KEY, type Theme } from '@/lib/theme'

function readSaved(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    return null
  }
}

function initialTheme(): Theme {
  return resolveTheme(readSaved(), window.matchMedia('(prefers-color-scheme: dark)').matches)
}

/** Theme state synced to the `dark` class on <html> and persisted on explicit toggles. */
export function useTheme(): { readonly theme: Theme; readonly toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // Storage can be unavailable (private mode); the toggle still works for this visit.
      }
      return next
    })
  }, [])

  return { theme, toggle }
}
