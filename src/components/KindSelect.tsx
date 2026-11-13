import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface KindOption<K extends string> {
  readonly kind: K
  /** Plain-language name, e.g. "Turn angle, weak shock". */
  readonly name: string
}

/** "Known: [quantity ▾]" — which quantity the user is giving. */
export function KindSelect<K extends string>({
  id,
  options,
  value,
  onChange,
}: {
  id: string
  options: readonly KindOption<K>[]
  value: K
  onChange: (kind: K) => void
}) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <label htmlFor={id} className="text-ink-2">
        Known
      </label>
      <Select
        value={value}
        onValueChange={(v) => {
          const match = options.find((o) => o.kind === v)
          if (match !== undefined) onChange(match.kind)
        }}
      >
        <SelectTrigger id={id} className="h-10 min-w-44 bg-surface text-base">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.kind} value={o.kind} className="text-base">
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  )
}
