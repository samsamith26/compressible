import type { KeyboardEvent } from 'react'
import { nudge } from '@/lib/nudge'
import { parseNumber } from '@/lib/parseNumber'

/** ArrowUp/ArrowDown step a numeric text field (Shift for a coarser step). */
export function useNudgeKeys(
  text: string,
  onChange: (text: string) => void,
): (event: KeyboardEvent<HTMLInputElement>) => void {
  return (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    const value = parseNumber(text)
    if (value === null) return
    event.preventDefault()
    onChange(String(nudge(value, event.key === 'ArrowUp' ? 1 : -1, event.shiftKey)))
  }
}
