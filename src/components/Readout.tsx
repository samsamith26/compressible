import { cn } from '@/lib/cn'
import type { Quantity } from '@/lib/fields'
import { formatValue } from '@/lib/format'

export interface ReadoutRow {
  readonly key: string
  readonly quantity: Quantity
  readonly value: number | null
  /** Marks the row that matches the person's input. */
  readonly isInput?: boolean
}

interface ReadoutProps {
  readonly rows: readonly ReadoutRow[]
  /** Dim the values while the current input is invalid (they are the last valid ones). */
  readonly stale: boolean
}

/** Dense key/value grid of results. A value flashes once when it changes. */
export function Readout({ rows, stale }: ReadoutProps) {
  return (
    <dl
      className={cn(
        'grid grid-cols-1 overflow-hidden min-[420px]:grid-cols-2 xl:grid-cols-3 transition-opacity duration-200',
        stale && 'opacity-45',
      )}
      aria-busy={stale}
    >
      {rows.map((row) => {
        const text = formatValue(row.value)
        return (
          <div key={row.key} className="flex items-baseline justify-between gap-3 px-4 py-3 shadow-[0_0_0_0.5px_var(--rule)]">
            <dt className="text-sm" title={row.quantity.name}>
              <span className={cn('font-medium', row.isInput === true && 'text-up')}>{row.quantity.label}</span>
              <span className="sr-only"> ({row.quantity.name})</span>
            </dt>
            <dd className="num text-right text-[0.95rem]">
              <span key={text} className="flash">
                {text}
              </span>
              {row.quantity.unit === undefined || row.value === null ? null : (
                <span className="text-muted">{row.quantity.unit}</span>
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
