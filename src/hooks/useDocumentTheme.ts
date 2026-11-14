import { useSyncExternalStore } from 'react'
import type { Theme } from '@/lib/theme'

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function snapshot(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/** The theme currently applied to <html>, for colours computed in JS (follows the toggle live). */
export function useDocumentTheme(): Theme {
  return useSyncExternalStore(subscribe, snapshot, () => 'light')
}
