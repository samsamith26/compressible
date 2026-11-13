import { useState } from 'react'
import type { Result } from '@/physics'

/**
 * The most recent successful value of a Result, so the UI can keep showing (dimmed)
 * the last valid answer while the input is invalid or half-typed.
 */
export function useLastOk<T>(result: Result<T> | null, initial: T): T {
  const [last, setLast] = useState<T>(initial)
  if (result?.ok === true && result.value !== last) {
    // Adjusting state during render from a changed input is React's documented
    // pattern for derived state; it re-renders immediately without an effect.
    setLast(result.value)
    return result.value
  }
  return last
}
