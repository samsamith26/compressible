import { useState } from 'react'

/**
 * The most recent successful value of `result`, so the UI can keep showing (dimmed) results
 * while the person is typing an invalid or incomplete value.
 */
export function useLastOk<T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false },
  initial: T,
): T {
  const [last, setLast] = useState(initial)
  if (result.ok && result.value !== last) setLast(result.value)
  return result.ok ? result.value : last
}
