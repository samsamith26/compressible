import type { Quantity } from '@/lib/fields'
import { NumberField } from './NumberField'

interface GammaFieldProps {
  readonly value: string
  readonly onChange: (text: string) => void
  readonly error: string | null
}

const GAMMA: Quantity = { label: 'γ', name: 'ratio of specific heats' }

/** γ is shared by every calculator (query key `g`). */
export function GammaField({ value, onChange, error }: GammaFieldProps) {
  return (
    <NumberField
      quantity={GAMMA}
      value={value}
      onChange={onChange}
      error={error}
      hint="1.4 for air; shared by all calculators"
    />
  )
}
