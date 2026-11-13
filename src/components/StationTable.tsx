import type { ReactNode } from 'react'
import { formatValue } from '@/lib/format'
import { plainLabel } from '@/lib/quantity'
import { cn } from '@/lib/utils'
import { Quantity } from './Quantity'

export interface StationColumn {
  readonly key: string
  readonly label: ReactNode
  /** Station colour shown as a rule above the header. */
  readonly tone?: 's1' | 's2'
  /** The column the result is about (e.g. the selected oblique solution). */
  readonly emphasis?: boolean
}

export interface StationRow {
  readonly key: string
  /** Quantity label markup, e.g. "p_2/p_1". */
  readonly label: string
  readonly values: readonly (number | null)[]
}

const TONE: Readonly<Record<'s1' | 's2', string>> = {
  s1: 'border-t-s1',
  s2: 'border-t-s2',
}

export function StationTable({
  caption,
  columns,
  rows,
  stale,
}: {
  caption: string
  columns: readonly StationColumn[]
  rows: readonly StationRow[]
  stale: boolean
}) {
  return (
    <div className="min-w-0">
      <table
        data-stale={stale}
        aria-label={caption}
        className={cn('w-full border-collapse text-base transition-opacity', stale && 'opacity-45')}
      >
        <thead>
          <tr>
            <th scope="col" className="pb-2 text-left text-sm font-normal text-ink-2">
              Quantity
            </th>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'border-t-[3px] border-t-transparent pt-1.5 pb-2 pl-3 text-right text-sm font-normal text-ink-2',
                  c.tone !== undefined && TONE[c.tone],
                  c.emphasis === true && 'font-bold text-ink',
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} aria-label={plainLabel(r.label)} className="border-t border-rule">
              <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                <Quantity label={r.label} />
              </th>
              {r.values.map((v, i) => (
                <td
                  key={columns[i]?.key ?? i}
                  className={cn(
                    'num py-1.5 pl-3 text-right whitespace-nowrap',
                    columns[i]?.emphasis === true ? 'text-ink' : 'text-ink-2',
                  )}
                >
                  {v === null ? '—' : formatValue(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p aria-live="polite" className={cn('mt-2 text-sm text-ink-2', !stale && 'sr-only')}>
        {stale ? 'Showing the last valid result.' : ''}
      </p>
    </div>
  )
}
