import { useId } from 'react'
import type { Quantity } from '@/lib/fields'

interface KindSelectProps<K extends string> {
  readonly label: string
  readonly kinds: readonly K[]
  readonly quantities: Readonly<Record<K, Quantity>>
  readonly value: K
  readonly onChange: (kind: K) => void
}

/** Native select (best keyboard and mobile behaviour) for "which quantity do you know?". */
export function KindSelect<K extends string>({ label, kinds, quantities, value, onChange }: KindSelectProps<K>) {
  const id = useId()
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => {
            const next = kinds.find((k) => k === e.target.value)
            if (next !== undefined) onChange(next)
          }}
          className="h-10 w-full cursor-pointer appearance-none rounded-md border border-rule bg-panel pl-3 pr-9 text-base outline-none transition-colors focus:border-ring"
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {quantities[k].label} — {quantities[k].name}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  )
}
