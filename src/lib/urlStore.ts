/**
 * The URL query string as an external store. Calculators read their inputs from it and write
 * every edit back with `replaceState`, so the address bar is always a shareable link.
 */

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function subscribeSearch(listener: () => void): () => void {
  listeners.add(listener)
  if (listeners.size === 1) window.addEventListener('popstate', notify)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('popstate', notify)
  }
}

export function getSearch(): string {
  return window.location.search
}

/** Merge `updates` into the query string without adding a history entry. */
export function updateSearch(updates: Readonly<Record<string, string>>): void {
  const params = new URLSearchParams(window.location.search)
  for (const [key, value] of Object.entries(updates)) params.set(key, value)
  const search = params.toString()
  const url = `${window.location.pathname}${search === '' ? '' : `?${search}`}${window.location.hash}`
  window.history.replaceState(window.history.state, '', url)
  notify()
}
