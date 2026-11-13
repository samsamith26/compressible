import { useState } from 'react'
import { parseNumber } from '@/lib/parseNumber'

/**
 * The most recent γ the user typed that is a valid ratio of specific heats
 * (> 1). Charts and drags use it, so a γ mid-edit ("1", "1.", "abc") never feeds
 * them an impossible value.
 */
export function useLastValidGamma(text: string, fallback = 1.4): number {
  const [last, setLast] = useState(fallback)
  const g = parseNumber(text)
  if (g !== null && g > 1 && g !== last) {
    setLast(g)
    return g
  }
  return last
}
