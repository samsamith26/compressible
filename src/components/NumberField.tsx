import { useId } from 'react'
import { useNudgeKeys } from '@/hooks/useNudgeKeys'
import { cn } from '@/lib/cn'
import type { Quantity } from '@/lib/fields'

interface NumberFieldProps {
  readonly quantity: Quantity
  readonly value: string
  readonly onChange: (text: string) => void
  /** Message shown under the field and announced to screen readers. */
  readonly error?: string | null
  readonly hint?: string
  readonly tone?: 'up' | 'neutral'
}

/** A live numeric text field. Arrow keys nudge the value; nothing waits for a submit. */
export function NumberField({ quantity, value, onChange, error, hint, tone = 'neutral' }: NumberFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const onKeyDown = useNudgeKeys(value, onChange)
  const invalid = error !== null && error !== undefined

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{quantity.label}</span>
        <span className="text-xs text-muted">{quantity.name}</span>
      </label>
      <div
        className={cn(
          'flex items-center rounded-md border bg-panel transition-colors focus-within:border-ring',
          invalid ? 'border-danger' : 'border-rule',
          tone === 'up' && !invalid && 'border-l-2 border-l-up',
        )}
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          aria-invalid={invalid}
          aria-describedby={messageId}
          className="num h-10 w-full min-w-0 bg-transparent px-3 text-base outline-none"
        />
        {quantity.unit === undefined ? null : (
          <span className="num pr-3 text-muted" aria-hidden="true">
            {quantity.unit}
          </span>
        )}
      </div>
      <p id={messageId} aria-live="polite" className={cn('min-h-4 text-xs', invalid ? 'text-danger' : 'text-muted')}>
        {invalid ? error : (hint ?? '')}
      </p>
    </div>
  )
}
