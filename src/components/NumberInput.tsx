import type { KeyboardEvent } from 'react'
import { nudge } from '@/lib/parseNumber'
import { plainLabel } from '@/lib/quantity'
import { cn } from '@/lib/utils'
import { Quantity } from './Quantity'

/**
 * A text field for a number. The text is kept exactly as typed (so "1." is fine
 * mid-edit); the arrow keys step it, with Shift for ten steps.
 */
export function NumberInput({
  id,
  label,
  text,
  onTextChange,
  error,
  unit,
  width = 'w-24',
}: {
  id: string
  /** Quantity label markup, e.g. "M_1". */
  label: string
  text: string
  onTextChange: (text: string) => void
  error?: string | undefined
  unit?: string
  width?: string
}) {
  const errorId = `${id}-error`

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    const next = nudge(text, e.key === 'ArrowUp' ? 1 : -1, e.shiftKey)
    if (next === null) return
    e.preventDefault()
    onTextChange(next)
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-baseline gap-2">
        <label htmlFor={id} className="whitespace-nowrap text-ink-2">
          <Quantity label={label} /> =
        </label>
        <span className="inline-flex items-baseline gap-1">
          <input
            id={id}
            aria-label={plainLabel(label)}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={onKeyDown}
            aria-invalid={error !== undefined}
            aria-describedby={error !== undefined ? errorId : undefined}
            className={cn(
              'num h-10 rounded-md border border-input bg-surface px-2.5 text-lg text-ink',
              'focus-visible:border-ring',
              error !== undefined && 'border-error',
              width,
            )}
          />
          {unit !== undefined && <span className="text-ink-2">{unit}</span>}
        </span>
      </span>
      {error !== undefined && (
        <span id={errorId} role="alert" className="max-w-xs text-sm text-error">
          {error}
        </span>
      )}
    </span>
  )
}
