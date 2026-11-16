import { useId } from 'react'
import { SHADE_NAMES } from './labels'
import { SHADE_PROPERTIES, type ShadeProperty } from './types'

/** "Shade regions by …", shared by both inlet modes (same names as the legend). */
export function ShadeSelect({ value, onChange }: { readonly value: ShadeProperty; readonly onChange: (p: ShadeProperty) => void }) {
  const id = useId()
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        Shade regions by
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const next = SHADE_PROPERTIES.find((p) => p === e.target.value)
          if (next !== undefined) onChange(next)
        }}
        className="h-10 w-full cursor-pointer rounded-md border border-rule bg-panel px-3 text-base outline-none focus:border-ring"
      >
        {SHADE_PROPERTIES.map((p) => (
          <option key={p} value={p}>
            {SHADE_NAMES[p]}
          </option>
        ))}
      </select>
    </div>
  )
}
