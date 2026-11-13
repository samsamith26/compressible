import { Quantity } from '@/components/Quantity'

export interface LegendItem {
  readonly key: string
  /** Quantity label markup. */
  readonly label: string
  /** CSS colour of the mark (the text stays in ink). */
  readonly color: string
  readonly dashed?: boolean
  readonly dot?: boolean
}

/** Legend keyed with a short stroke (or dot) of each series colour. */
export function Legend({ items }: { items: readonly LegendItem[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm text-ink-2">
      {items.map((it) => (
        <li key={it.key} className="inline-flex items-center gap-1.5">
          <svg width="18" height="10" aria-hidden="true">
            {it.dot === true ? (
              <circle cx="9" cy="5" r="4" fill={it.color} />
            ) : (
              <line x1="1" x2="17" y1="5" y2="5" stroke={it.color} strokeWidth={2} strokeDasharray={it.dashed === true ? '4 3' : undefined} strokeLinecap="round" />
            )}
          </svg>
          <Quantity label={it.label} />
        </li>
      ))}
    </ul>
  )
}
